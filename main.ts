import {
  Application,
  Context,
  Response,
  Router,
} from "https://deno.land/x/oak@v12.5.0/mod.ts";
import type { RouterContext as XContext } from "https://deno.land/x/oak@v12.5.0/mod.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.24.0";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

type RouterContext = XContext<any, any, any>;

const COURSID_MIN = 1;
// COURID_IDの理論的最大値 2014 + COURID_MAX/4 = 年数、2039年までリクエストを許容
const COURSID_MAX = 104;

const env = config();
const adminApiKey = Deno.env.get("ADMIN_API_KEY") || env.ADMIN_API_KEY;
const supabaseUrl = Deno.env.get("SUPABASE_URL") || env.SUPABASE_URL;
const supabaseKey = Deno.env.get("SUPABASE_KEY") || env.SUPABASE_KEY;

// キャッシュマップの定義
let cacheBases = new Map<number, string>();
let cacheBasesWithOgp = new Map<number, string>();

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

interface Base {
  [key: string]: string | number | null;
  id: number;
  title: string;
  title_short1: string;
  title_short2: string;
  title_short3: string;
  title_en: string;
  public_url: string;
  twitter_account: string;
  twitter_hash_tag: string;
  cours_id: number;
  created_at: string;
  updated_at: string;
  sex: number;
  sequel: number;
  city_code: number;
  city_name: string;
  product_companies: string;
}

interface Ogp {
  og_title: string;
  og_description: string;
  og_url: string;
  og_image: string;
  og_site_name: string;
}

async function selectBasesRdb(coursId: number): Promise<Base[]> {
  const { data, error } = await supabase
    .from("bases")
    .select(`
      id,
      title,
      title_short1,
      title_short2,
      title_short3,
      title_en,
      public_url,
      twitter_account,
      twitter_hash_tag,
      cours_id,
      created_at,
      updated_at,
      sex,
      sequel,
      city_code,
      city_name,
      product_companies
    `)
    .eq("cours_id", coursId);

  if (error) {
    throw error;
  }

  return data || [];
}

async function selectBasesWithOgpRdb(coursId: number) {
  // JOINするときは適切にテーブルに外部キーが設定されている必要がある
  const { data, error } = await supabase
    .from("bases")
    .select(`
        id,
        title,
        title_short1,
        title_short2,
        title_short3,
        title_en,
        public_url,
        twitter_account,
        twitter_hash_tag,
        cours_id,
        created_at,
        updated_at,
        sex,
        sequel,
        city_code,
        city_name,
        product_companies,
        site_meta_data (
          og_title,
          og_type,
          og_description,
          og_url,
          og_image,
          og_site_name
        )
  `)
    .eq("cours_id", coursId);

  if (error) {
    throw error;
  }

  if (data) {
    return data.map((item) => {
      const newItem: any = { ...item }; // newItemの型を一時的にanyとする
      if (newItem.site_meta_data) {
        newItem.ogp = Object.fromEntries(
          Object.entries(newItem.site_meta_data).map(([key, value]) => [
            key,
            value == null ? "" : value,
          ]),
        );
      }
      delete newItem.site_meta_data;
      return newItem;
    });
  }

  return [];
}

async function coursHandler(context: Context) {
  const { data, error: _ } = await supabase
    .from("cours_infos")
    .select();

  if (data) {
    const transformedResponse = data.reduce((acc, curr) => {
      acc[curr.id] = {
        id: curr.id,
        year: curr.year,
        cours: curr.cours,
      };

      return acc;
    }, {});

    const response = JSON.stringify(transformedResponse, null, 2);
    context.response.body = response;
    context.response.headers.set("Content-Type", "application/json");
  } else {
    context.response.body = "Error fetching data";
  }
}

async function yearTitleHandler(context: RouterContext) {
  if (context?.params?.year_num) {
    const year = context.params.year_num;
    // yearを数値に変換する
    const yearNum = parseInt(year);

    // cours_infosテーブルからyearをキーにしてidカラムのみを取得する、そのidをキーにbasesテーブルのidとtitleカラムを取得する
    const { data, error: _ } = await supabase
      .from("cours_infos")
      .select("id")
      .eq("year", yearNum);
    const idTitles = await Promise.all(
      data?.map(async (cours) => {
        const { data: data2, error: _ } = await supabase
          .from("bases")
          .select("id, title")
          .eq("cours_id", cours.id);
        return data2;
      }) || [],
    );

    // idTitlesをJSONに変換しレスポンスに格納する
    // idTitlesは配列の配列なので、配列をフラットにする
    const idTitlesFlat = idTitles.flat();
    if (idTitlesFlat) {
      context.response.headers.set("Content-Type", "application/json");
      context.response.body = JSON.stringify(idTitlesFlat, null, 2);
    }
  } else {
    context.response.body = "Error fetching data";
  }
}

async function animeAPIReadHandler(context: RouterContext) {
  if (context?.params?.year_num && context?.params?.cours) {
    const yearNum = parseInt(context.params.year_num);
    const cours = parseInt(context.params.cours);
    // 現在時刻とyearNumとcoursをログレベルインフォで出力する
    console.info(jst(), yearNum, cours);
    const cid: number = yearSeson2Cours(yearNum, cours);
    context.response.body = cid.toString();

    if (cid < COURSID_MIN || cid > COURSID_MAX) {
      // http status エラーを返す
      context.response.status = 400;
      // レスポンスの本文としてエラーメッセージが入ったJSONを返す
      context.response.body = JSON.stringify({ error: "Bad Request" });
      return;
    }

    // console.log(context.request.url.searchParams.get("ogp"));
    // リクエストパラメータにogpがあり値が1の場合の処理
    if (context.request.url.searchParams.get("ogp") === "1") {
      const basesWithOgp = await selectBasesWithOgpRdb(cid);
      if (basesWithOgp) {
        // basesの中でstring型で値がnullのものを空文字に変換する
        basesWithOgp.forEach((base) => {
          Object.keys(base).forEach((key) => {
            if (typeof base[key] === "object" && base[key] === null) {
              base[key] = "";
            }
          });
        });
        context.response.headers.set("Content-Type", "application/json");
        context.response.body = JSON.stringify(basesWithOgp, null, 2);
      }
      return;
    }

    // cidをもとにselectBasesRdbを呼び出す
    const bases: Base[] = await selectBasesRdb(cid);

    // basesの中でstring型で値がnullのものを空文字に変換する
    bases.forEach((base) => {
      Object.keys(base).forEach((key) => {
        //console.log(typeof base[key] + " " + base[key]);
        if (typeof base[key] === "object" && base[key] === null) {
          base[key] = "";
        }
      });
    });

    // jsonをレスポンスに格納する
    if (bases) {
      context.response.headers.set("Content-Type", "application/json");
      context.response.body = JSON.stringify(bases, null, 2);
    }
  } else {
    // http status エラーを返す
    context.response.status = 400;
    // レスポンスの本文としてエラーメッセージが入ったJSONを返す
    context.response.body = JSON.stringify({ error: "Bad Request" });
  }
}

// TODO キャッシュを全てクリアする
async function cacheClear(context: Context) {
  cacheBases = new Map();
  cacheBasesWithOgp = new Map();
}

// TODO キャッシュを全て再取得する
async function cacheRefresh(context: Context) {
  cacheBases = new Map();
  cacheBasesWithOgp = new Map();

  for (let i = coursidMin; i <= coursidMax; i++) {
    let json = await selectBasesRdb(i);
    if (json) {
      cacheBases.set(i, json);
    }

    json = await selectBasesWithOgpRdb(i);
    if (json) {
      cacheBasesWithOgp.set(i, json);
    }
  }
}

function yearSeson2Cours(year: number, season: number): number {
  return (year - 2014) * 4 + season;
}

// TODO 管理者用API認証ミドルウェア
async function middlewareAdminAuthAPI(
  ctx: { request: ServerRequest; response: Response },
  next: () => Promise<void>,
) {
  const headers = ctx.request.headers;
  const apiKey = headers.get("X-ANIME_CLI_API_KEY");

  if (apiKey !== adminApiKey) {
    ctx.response.status = 401;
    ctx.response.body = "Unauthorized";
  } else {
    await next();
  }
}

function rootPage(ctx: Context) {
  ctx.response.body = "ShangriLa Anime API\n\
https://github.com/Project-ShangriLa";
}

function jst(): string {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    timeZone: "Asia/Tokyo", 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    hourCycle: 'h23'
  };
  
  return new Intl.DateTimeFormat('en-GB', options).format(date);
}

// アプリケーションを起動する
async function startApp() {
  const app = new Application();
  const router = new Router();

  router.get("/", rootPage);
  router.get("/anime/v1/master/cours", coursHandler);
  router.get("/anime/v1/master/:year_num", yearTitleHandler);

  router.get("/anime/v1/master/:year_num/:cours", animeAPIReadHandler);

  router.post("/anime/v1/master/cache/clear", cacheClear);
  router.post("/anime/v1/master/cache/refresh", cacheRefresh);
  // 時刻を返すエンドポイントの登録（テスト用）
  router.get("/time", (ctx) => {
    const now = new Date(); // 現在の時刻を取得
    ctx.response.headers.set("Content-Type", "application/json"); // レスポンスのヘッダーにJSON形式であることを明示
    ctx.response.body = { "time": now.toISOString() }; // JSON形式で現在の時刻を返す
  });
  // API認証ミドルウェアを登録
  //app.use(middlewareAdminAuthAPI);

  //TODO: 必要なルーティングのみに絞りたい
  app.use(oakCors()); // Enable CORS for All Routes
  // ルートを登録
  app.use(router.routes());
  app.use(router.allowedMethods());

  // 起動ログ
  console.info(jst(), "==== Server Start ====");

  // アプリケーションを起動
  await app.listen({ port: 8000 });
}

// アプリケーションの起動を開始
startApp();
