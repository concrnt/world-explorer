# concurrent-community-cache

このリポジトリでは、Concurrent 向けのコミュニティキャッシュを提供する簡易的な API を実装しています。  
API では、キャッシュデータの取得や検索が可能です。

## 環境変数

- **CONCRNT_API_HOST**  
  未使用（現在はログ出力のみ）。将来的にサーバーホストの指定などで利用する予定がある場合は設定してください。
- **SERVER_PORT**  
  サーバーを起動するポート番号を指定します。
- **CACHE_INTERVAL_MILLISECONDS**
  スクレイピングのインターバル

## インストール・起動手順

```bash
# 依存関係のインストール
npm install

# サーバー起動
npm run start
```

## エンドポイント一覧

### GET `/`

- **概要**  
  サーバーが起動しているかどうかを確認するためのシンプルなエンドポイントです。
- **レスポンス**
  ```
  concurrent community cache
  ```

### GET `/cache`

- **概要**  
  キャッシュされたドメインおよびタイムラインを返却します。オプションのクエリパラメータによって返却内容を制御できます。

- **クエリパラメータ**

  | パラメータ     | 型     | 必須 | 説明                                                                                                                                                  |
    | -------------- | ------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `showOffline`  | string | 任意 | `true` を指定すると、オフラインも含むすべてのキャッシュデータを返却します。<br>デフォルトまたは指定なしの場合は、`domain.ccid` が存在する(オンラインの)データのみ返却します。 |
  | `q`            | string | 任意 | 検索キーワードを指定できます。<br>指定がある場合、Minisearch を用いた前方一致の「ファジー検索」を行い、ヒットしたタイムラインのみ返却します。<br>指定がない場合は、オフライン指定に応じたすべてのタイムラインを返却します。 |

- **使用例**

    1. オンラインのキャッシュのみ取得
       ```
       GET /cache
       ```

    2. オフラインを含むすべてのキャッシュを取得
       ```
       GET /cache?showOffline=true
       ```

    3. ファジー検索（キーワードが "con"）
       ```
       GET /cache?q=con
       ```
        - この場合、検索キーワードにマッチしたタイムラインのみ返却します。（オンラインのみ）

- **レスポンス例 (JSON)**

レスポンス例は [src/type.ts](src/type.ts) のDomainCache[]を参照してください。

## 処理の流れ

1. **キャッシュ更新 (初回・定期)**  
   サーバー起動時に `task()` が実行され、`gather()` によって取得されたキャッシュをもとにオンライン・オフラインを判定し、それぞれ `aliveCache` と `cache` に格納します。

2. **Minisearch のインデックス作成**  
   オンラインのタイムラインデータを Miniseach に登録し、`q` が指定された場合のファジー検索を実現します。

3. **定期更新**  
   `CACHE_INTERVAL_MILLISECONDS`毎に定期的にキャッシュ更新が実行されます（`setInterval` で `task()` を呼び出し）。
