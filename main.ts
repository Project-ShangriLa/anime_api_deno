import {
  Application,
  Context,
  Response,
  Router,
} from "https://deno.land/x/oak/mod.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { oakCors } from "https://deno.land/x/cors/mod.ts";

// envファイルの読み込み
const env = config();

// 定数の設定
const COURSID_MIN = 1;
const COURSID_MAX = 128;
const cApiKey = config().API_KEY;

// キャッシュマップの定義
let cacheBases = new Map<number, string>();
let cacheBasesWithOgp = new Map<number, string>();

// ルートパラメータの型定義
interface RouteParams {
  year_num?: string;
  cours?: string;
}

// データベースからデータを取得する関数（抽象化）
async function selectBasesRdb(id: number) {
  // TODO: ここでデータベースからデータを取得します
}

async function selectBasesWithOgpRdb(id: number) {
  // TODO: ここでデータベースからデータを取得します
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || env.SUPABASE_URL;
const supabaseKey = Deno.env.get("SUPABASE_KEY") || env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

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
  } else {
    context.response.body = "Error fetching data";
  }
}

async function yearTitleHandler(w: ServerRequest, r: RouteParams) {
  // TODO: 実際の処理
}

async function animeAPIReadHandler(w: ServerRequest, r: RouteParams) {
  // TODO: 実際の処理
}

// キャッシュを全てクリアする
async function cacheClear(w: ServerRequest, r: RouteParams) {
  cacheBases = new Map();
  cacheBasesWithOgp = new Map();
}

// キャッシュを全て再取得する
async function cacheRefresh(w: ServerRequest, r: RouteParams) {
  cacheBases = new Map();
  cacheBasesWithOgp = new Map();

  for (let i = COURSID_MIN; i <= COURSID_MAX; i++) {
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

// 管理者用API認証ミドルウェア
async function middlewareAdminAuthAPI(
  ctx: { request: ServerRequest; response: Response },
  next: () => Promise<void>,
) {
  const headers = ctx.request.headers;
  const apiKey = headers.get("X-ANIME_CLI_API_KEY");

  if (apiKey !== cApiKey) {
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

// アプリケーションを起動する
async function startApp() {
  const app = new Application();
  const router = new Router();


  router.get('/', rootPage);
  router.get("/anime/v1/master/cours", coursHandler);
  router.get("/anime/v1/master/:year_num", yearTitleHandler);
  router.get("/anime/v1/master/:year_num/:cours", animeAPIReadHandler);

  router.post("/anime/v1/master/cache/clear", cacheClear);
  router.post("/anime/v1/master/cache/refresh", cacheRefresh);
  // 時刻を返すエンドポイントの登録
  router.get("/time", (ctx) => {
    const now = new Date(); // 現在の時刻を取得
    ctx.response.body = { "time": now.toISOString() }; // JSON形式で現在の時刻を返す
  });
  // API認証ミドルウェアを登録
  //app.use(middlewareAdminAuthAPI);

  app.use(oakCors()); // Enable CORS for All Routes
  // ルートを登録
  app.use(router.routes());
  app.use(router.allowedMethods());

  // アプリケーションを起動
  await app.listen({ port: 8000 });
}

// アプリケーションの起動を開始
startApp();
