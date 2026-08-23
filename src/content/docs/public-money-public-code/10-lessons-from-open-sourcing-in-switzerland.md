---
title: "スイスのオープンソース化から得られた教訓"
---

<aside class="translation-attribution">
このページは Free Software Foundation Europe による
<a href="https://download.fsfe.org/campaigns/pmpc/PMPC-Modernising-with-Free-Software.pdf">Public Money Public Code</a>
を ChatGPT が翻訳したものに多少手を加えたものです。元の記事は
<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY‐SA 4.0 ライセンス</a>
のもとで提供されています。翻訳版も同じく CC BY‐SA 4.0 ライセンスのもとで提供されます。
</aside>

行政が自由ソフトウェアを公開することで、どのような利益が得られるのでしょうか？ ベルンのデジタル・サステナビリティ研究センター所長である Matthias Stürmer 博士が、行政機関が「公共財」の定義を見直すべき理由を説明します。

スイスでは、スイス連邦鉄道をはじめとする多くの政府機関や公的企業が、機密性のないデータはオープン・ガバメント・データ（OGD）として公開すべきだという考えで一致しています。連邦参事会は、国家OGD戦略も策定しました。この戦略の中で、政府は OGD がイノベーションを支援し、透明性と市民参加を可能にし、行政の効率を高めると説明しています。これらはまさに、政府が開発したアプリケーションを自由ソフトウェア・ライセンスのもとで公開する理由と同じです。デジタル・サステナビリティ議員連盟（Parldigi）は2009年に設立されました。議会での提案、公開ヒアリング、報道発表などを通じて、公共部門における自由ソフトウェア、オープンデータ、オープン標準を支援する活動を行っています。Parldigi には、SP、FDP、SVP、CVP、緑の党、GLP、BDP、EPP から50人を超える国民議会・全州議会の議員が参加しています。それではなぜ、政府機関によるソフトウェア公開がスイスで論争の対象となったのでしょうか。本稿では、この議論の背景と近年の出来事について説明します。

## 規制政策上の論点

2011年、スイス連邦裁判所は、内部で開発した事件管理システム「OpenJustitia」を自由ソフトウェアとして公開しました。[^1] 連邦裁判所は、他の連邦・州裁判所との協働を可能にし、長期的に開発コストを削減することを目指していました。しかし、この決定がすべての関係者から歓迎されたわけではありません。ベルンの小規模ソフトウェア企業 Weblaw は、この公開に反対しました。同社は、それまで自社のプロプライエタリな裁判事件管理システムを連邦裁判所やその他のスイスの裁判所へ販売していたからです。Weblaw は、連邦裁判所が納税者の負担する公費を用いてソフトウェア市場を歪めていると主張しました。[^2] これをきっかけに公の議論が起こり、ある国会議員は同社の立場を支持し、政府機関、特に連邦裁判所がアプリケーションを自由ソフトウェアとして公開することを禁止する規制政策を求めました。[^3]

この議論を受け、デジタル・サステナビリティ議員連盟（Parldigi）は、行政による自由ソフトウェア公開を支持する働きかけを行いました。[^4][^5]最終的に連邦政府は、政府が自由ソフトウェアを開発し、公開することが認められるべきか、また認められる場合にはどのような形で行うべきかについて、法律意見書の作成を依頼しました。残念ながら、依頼を受けた法学教授たちは自由ソフトウェアの開発モデルに詳しくなく、2014年に発表した36ページの文書で、政府が自由ソフトウェアを公開するには、それを明示的に認めるための専用の独立した法律を成立させる必要があるとの見解を示しました。[^6]この判断は、Parldigi に所属する国会議員から強い批判を受けました。[^7]

同じ時期の2014年、スイスで2番目に大きな地域であるベルン州の議会は、行政機関が他の行政機関とソフトウェア開発で協働し、自由ソフトウェア・ライセンスのもとでソフトウェアを公開することにより相乗効果を活用すべきだという政策決定を、130票の全会一致で可決しました。[^8]さらに、ベルン州の依頼と資金提供による2つ目の法律意見書が作成され、2016年に公開されました。[^9] この2つ目の法律意見書は、実際には政府機関が自由ソフトウェアを公開するために別個の法律は必要ないと結論付けました。その理由は、ソースコードそのものは完全に販売可能な資源とはいえず、それを公開するために特別な規制を必要とする性質のものではないからです。したがって、行政組織による自由ソフトウェアの公開は、重大な市場介入とは評価できません。複雑なソフトウェアを実際に利用するには、単にコードを実行するだけでは済みません。ITシステムには、計画、統合、カスタマイズ、データ移行、研修、サポートなどが必要となります。行政がソフトウェアを公開しただけでは、これらの作業は実現しません。公開されたソースコードを実際に利用できるようにするのは、専門サービスを提供する企業です。したがって、自由ソフトウェアの公開は民間部門を妨げたり競合したりするものではありません。むしろ反対に、自由ソフトウェアを取り巻く商用サービスに新たな機会と需要を生み出します。

## スイスの行政による自由ソフトウェア公開の事例

2018年、ベルン州は正式に自由ソフトウェアの公開に取り組み始めました。最初に既存の規則を拡充し、自らのソースコードを自由ソフトウェア・ライセンスのもとで公開することが認められると明記しました。[^10]次に、州のIT部門が、自由ソフトウェアの公開を法務・技術・組織の各面から具体的にどのように進めるべきかについてガイドラインを策定しました。[^11]そして最後の段階として、州は自由ソフトウェアのコードをプラットフォーム上、おそらく GitHub で公開する計画を立てています。

その一方で、スイスの首都ベルン市も2018年に初めて自由ソフトウェア・アプリケーションの公開を始めました。保育費を管理するソフトウェア[^12][^13]と、「Submiss」と呼ばれる公共調達向けの大規模ITソリューションで、後者も近く公開される予定です。

また、政治的な議論が続く一方で、国レベルの政府機関も数年前からソースコードを公開しています。スイス連邦地形局（swisstopo）は、他の公共機関と協働するため、地理情報ポータルのコード一式を GitHub で公開・保守しています。[^14]さらに、スイスの気象機関も大量のコードを自由ソフトウェア・ライセンスのもとで公開しており[^15]、政府の失業保険機関も最近、大規模なウェブプラットフォームを公開し、そのソースコードを GitHub で提供しています。[^16]

こうした事例は、連邦裁判所をめぐる当初の対立にもかかわらず、スイスの公的機関が自由ソフトウェア・ライセンスのもとでコードを公開することに強く取り組んでいることを示しています。この方向転換は、実務担当者への具体的な支援と、効果的な政治的働きかけを組み合わせることが、長期的に好ましい効果を生み、自由ソフトウェアの公開に対する幅広い支持へつながることを示しています。[^17]

![Matthias Stürmer 博士のポートレート](./assets/matthias-stuermer.jpg)

<aside class="context-aside">

Dr. Matthias Stürmer

Matthias Stürmer 博士は、ベルン大学デジタル・サステナビリティ研究センターの所長です。自由ソフトウェア、オープンデータ、リンクトデータ、オープンガバメント、ブロックチェーン、スマートシティ、公共調達、デジタル・サステナビリティについて研究・教育・コンサルティングを行っています。2013年までは EY（Ernst & Young）のマネージャー、およびスイスのオープンソース事業者 Liip AG のプロジェクトリーダーを務めていました。2009年には ETH Zürich で、オープンソース・コミュニティと企業参加をテーマとした博士論文を完成させました。スイスのデジタル・サステナビリティ議員連盟の事務局を務めるほか、2011年からベルン市議会議員でもあります。

</aside>

[^1]: [Inside IT](https://www.inside-it.ch/articles/26217).

[^2]: [Plaedoyer](https://www.plaedoyer.ch/document/?no_cache=1&m=Artikel&rid=1088723&attr=zusatz).

[^3]: [Swiss Parliament, Affair 20124273](https://www.parlament.ch/de/ratsbetrieb/suche-curiavista/geschaeft?AffairId=20124273).

[^4]: [Swiss Parliament, Affair 20113379](https://www.parlament.ch/de/ratsbetrieb/suche-curiavista/geschaeft?AffairId=20113379).

[^5]: [Swiss Parliament, Affair 20124247](https://www.parlament.ch/de/ratsbetrieb/suche-curiavista/geschaeft?AffairId=20124247).

[^6]: [News admin](http://www.news.admin.ch/NSBSubscriber/message/attachments/37015.pdf) and [Blick](https://www.blick.ch/news/politik/gutachten-gegen-sparenbund-darf-keine-gratis-software-weitergeben-id3241215.html).

[^7]: [Bern Parliament](https://www.gr.be.ch/gr/de/index/geschaefte/geschaefte/suche/geschaeft.gid-df80389c50524a03aed5bbe9f4d0309c.html).

[^8]: [Digital Sustainability](https://www.digitale-nachhaltigkeit.ch/de/2016/08/gutachten-oss-freigabe).

[^9]: [Digital Sustainability](https://www.digitalenachhaltigkeit.ch/de/2018/04/oeffentliche-gelder-fuer-offene-software-kanton-bern-passtseine-gesetzgebung-an).

[^10]: OSS Studie 2018, articles by Rolf Aegler and Thomas Joos, [study](https://www.oss-studie.ch/assets/pdfs/OSS-Studie2018.pdf).

[^11]: [Canton of Bern guideline](https://www.digitalenachhaltigkeit.ch/de/2018/04/oeffentliche-gelder-fuer-offene-software-kanton-bern-passtseine-gesetzgebung-an).

[^12]: [Ki-Tax](https://github.com/StadtBern/Ki-Tax).

[^13]: [Manage child care funds](https://joinup.ec.europa.eu/news/manage-childcare-funds).

[^14]: [GeoAdmin](https://github.com/geoadmin/mf-geoadmin3).

[^15]: [MeteoSwiss](https://github.com/MeteoSwiss/easyVerification).

[^16]: [Job-Room](https://github.com/alv-ch/jobroom-api).

[^17]: [Der Bund](https://www.derbund.ch/bern/Eigennuetzige-Software-Geschenke/story/16408835).
