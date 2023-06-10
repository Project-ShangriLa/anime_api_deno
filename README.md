# Sora 穹

ShangriLa Anime API Server [2023~]

## ShangriLa Anime API Server システム概要

### 説明

アニメ作品の情報を返すREST形式のAPIサーバーです。

2014年以降のアニメ作品の情報を返却します。


### システム設定

- runtime: Deno
- Database: Supabase
- Deploy: Deno Delpoy

### 起動方法 (リリース)

```
deno task dev
```

### エンドポイント

http://anime-api.deno.dev/anime/v1

### 認証

導入予定


### レートリミット

なし

### GET /anime/v1/master/cours

ShangriLa API Serverが持っているアニメ情報のクールごとの情報のリストを返却します。

#### Request Body

なし

#### Response Body

| Property     | Value               |description|Sample|
| :------------ | :------------------ |:------|:-------|
| cours_idの値 | Cours Object |cours_idはシステムで割り振ったクールごとのユニークなID(coursマスターのID)|1|

##### Cours Object

| Property     | Value               |description|Sample|
| :------------ | :------------------ |:------|:-------|
| id | Number  |cours_id|6|
| year| Number |該当する西暦(YYYY)|2015|
| cours| Number |yearの中での順番[１〜４]|2|


レスポンス例

```
 $curl http://anime-api.deno.dev/anime/v1/master/cours | jq .

{
  "4": {
    "id": 4,
    "year": 2014,
    "cours": 4
  },
  "5": {
    "id": 5,
    "year": 2015,
    "cours": 1
  },
  "6": {
    "id": 6,
    "year": 2015,
    "cours": 2
  }
}
```


### GET /aime/v1/master/:year

:yearで指定されたYYYY年のアニメ1クールから4クールまでの情報をすべて返却します

#### Request Body

なし

#### Response Body

| Property     | Value               |description|Sample|
| :------------ | :------------------ |:--------|:-------|
| Array    |Base Object|データがない場合は空の配列|

##### Base Object

| Property     | Value               |description|Sample|
| :------------ | :------------------ |:--------|:-------|
| id    |Number|APIで管理するアニメ作品に割り当てられているユニークなID|125|
| title    |String|アニメ作品名|"冴えない彼女の育てかた"|


レスポンス例

```
curl http://anime-api.deno.dev/anime/v1/master/2015 | jq .
[
  {
    "id": 124,
    "title": "幸腹グラフィティ"
  },
  {
    "id": 125,
    "title": "銃皇無尽のファフニール"
  },
  {
    "id": 126,
    "title": "冴えない彼女の育てかた"
  },
  {
    "id": 127,
    "title": "暗殺教室"
  },
  {
    "id": 129,
    "title": "探偵歌劇ミルキィホームズTD"
  }
]
```


### GET /anime/v1/master/:year/:n

:yearで指定されたYYYY年アニメの:nで指定されたクールの情報をすべて返します。

* /2015/1 だったら2015年1期(冬期) のアニメ作品情報を全て返却します。
* /2015/2 だったら2015年2期(春期) のアニメ作品情報を全て返却します。

#### Request Body

なし

#### Response Body


| Property     | Value               |description|Sample|
| :------------ | :------------------ |:--------|:-------|
| Array    |Base Object|データがない場合は空の配列||

##### Base Object

requiredに◯がないものは値なし(=データメンテナンスしていない)の場合があります。

またプロパティは追加される可能性があります。

| Property     |Value |Required|description|Sample|
| :------------|:-----|:-------|:----------|:-----|
| id           |Number|◯|APIで管理するアニメ作品に割り当てられているユニークなID|125|
| title        |String|◯|アニメ作品名|"冴えない彼女の育てかた"|
| title_short1 |String|-|アニメ作品名の略称1|"冴えカノ"|
| title_short2 |String|-|アニメ作品名の略称2||
| title_short3 |String|-|アニメ作品名の略称3||
| public_url   |String|◯|アニメ作品の公式URL|"http://www.saenai.tv/"|
| twitter_account|String|◯|ツイッターアカウント|"saenai_heroine"|
| twitter_hash_tag|String|◯|ツイッターハッシュタグ|"saekano"|
| cours_id     |Number|◯|coursマスターのID|5|
| created_at   |String|◯|データの作成日時|"2015-01-08 09:37:01.0"|
| updated_at   |String|◯|データの更新日時|"2015-01-08 09:37:01.0"|
| sex          |Number|-|男性向け=0, 女性向け=1|0|
| sequel       |Number|-|続編モノの場合は1以上の数値が入る|0|
| city_code    |Number|-|代表聖地地区の5桁の市区町村コード(RESAS APIなど地方自治体のオープンデータと連携する時に使用)|22203|
| city_name    |String|-|代表聖地地区の市区町村名|静岡県静岡市|

レスポンス例

```
curl http://anime-api.deno.dev/anime/v1/master/2016/4 | jq .
[
  {
    "title_short2": "",
    "twitter_account": "3lion_anime",
    "public_url": "http://www.nhk.or.jp/anime/3lion/",
    "title_short1": "3月のライオン",
    "sex": 0,
    "twitter_hash_tag": "３月のライオン",
    "id": 465,
    "sequel": 0,
    "created_at": "2016-09-19 19:24:09.0",
    "city_name": "東京都中央区佃",
    "cours_id": 12,
    "title": "3月のライオン",
    "city_code": 13102,
    "title_short3": "",
    "updated_at": "2016-09-19 19:24:09.0"
  },
  {
    "title_short2": "Occultic;Nine",
    "twitter_account": "occultic_nine",
    "public_url": "http://www.occultic-nine.com/",
    "title_short1": "オカルティック・ナイン",
    "sex": 0,
    "twitter_hash_tag": "オカン",
    "id": 466,
    "sequel": 0,
    "created_at": "2016-09-19 19:24:09.0",
    "city_name": "東京都武蔵野市吉祥寺",
    "cours_id": 12,
    "title": "Occultic;Nine-オカルティック・ナイン-",
    "city_code": 13203,
    "title_short3": "オカン",
    "updated_at": "2016-09-19 19:24:09.0"
  },
]
```



