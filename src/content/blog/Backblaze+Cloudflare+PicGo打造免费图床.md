---
title: Backblaze + Cloudflare + PicGO 打造免费图床
date: 2025-02-23 03:00:00
categories: 
- 玩转系列
tags:
- 图床
- Backblaze
- Cloudflare
---

既然要写博客，那么肯定少不了图床。目前图床的选择方案也不少，比如：

- sm.ms
- imgUrl
- GitHub+jsDelivr
- 微博/B站等
- 又拍云/七牛云/腾讯云COS/阿里云OSS等

但是免费图床，随时有跑路风险，访问稳定性也有待商榷。收费的对象存储吧，价格或多或少有些贵了。如果经常写博客，图床使用很勤，那倒还行；但如果只是偶尔有感而发，一年可能都写不了几次的话，去掏OSS的钱就非常不值了。

那GitHub图床用的人也挺多的，配合jsDelivr使用的教程也很多，为什么不推荐呢？

因为[jsDelivr的新政策](https://www.jsdelivr.com/terms/acceptable-use-policy-jsdelivr-net)引起了广泛讨论：

> Abusing the service and its resources, or using jsDelivr as a general-purpose file or media hosting service. This includes, for example:
>
> - running an image hosting website and using jsDelivr as a storage for all uploaded images,
> - hosting videos, file backups, or other files in large quantities.

这里的`running an image hosting website and using jsDelivr as a storage for all uploaded images`的意义不是很明确，个人博客文章所存储的图片的数量和访问量，能算是【滥用】吗？

数据无价，面对这种可能封禁和删除账号的行为，为了保险起见，我们还是要寻求更靠谱的方案。

现在有一个非常好用的方案摆在面前：那就是Backblaze+Cloudflare。

![Backblaze加入带宽联盟](https://www.backblaze.com/blog/wp-content/uploads/2018/09/blog-1-backblaze-cloudflare-diagram.jpg)

为什么选这两个来组合呢？因为Backblaze对个人用户提供10G的免费存储额度，每天1G的下载流量和无限的上传流量。而且[Cloudflare带宽联盟](https://www.cloudflare.com/zh-cn/bandwidth-alliance/)中，Backblaze赫然在此列。这意味着Backblaze到Cloudflare的流量完全免费。所以二者结合，我们可以获得10G免费存储额度与不限量上传下载的图床。这对于个人博客来说，属实是绰绰有余了。对于超出免费额度的费用，Backblaze也属于行业最低了，具体可以去官网了解下，这里就不展开了。

## 注册域名

自建图床嘛，肯定需要一个自己的域名和博客配合食用。比较便宜的注册商是NameSilo，还能用支付宝支付，比较推荐。如果有信用卡或PayPal，也可以直接在Cloudflare注册域名，.com价格属于比较优惠的了，而且可以直接在Cloudflare的Dashboard里进行管理，非常方便。

注意，**不推荐**使用免费域名。

## 配置Backblaze

首先需要[注册一个Backblaze账号](https://www.backblaze.com/b2/sign-up.html?referrer=nopref)。

注册完并登录后，进入[控制台](https://secure.backblaze.com/b2_buckets.htm)，开始新建存储桶。

注意，把桶设为`Public`的话是需要验证邮箱的。所以按照提示先验证邮箱。此处就不赘述了，日常操作。

默认加密和对象锁选项保持为`Disable`就行。

存储桶的名称需要注意一下，不要定的太简单或太容易被猜测，最好是用`-`连接起来的单词，加上随机字符串，避免猜测爆破。

比如：

```
f97Xrk3hIv-kyle-ricardo
```

因为存储模式为Public时，黑客只需要知道你的OSS服务提供商+存储桶名称+里面随便一个文件名，即可拼凑出文件原始链接，从而绕过CDN刷爆流量，如果绑定了支付方式还会面对天价信用卡账单。

填好后点击`Create a Bucket`就可以创建好了。

![创建存储桶](https://img.kylericardo.com/2022-11-28-create-a-bucket-55b51bf4db2219178fb675051827d89e.png)

然后，点击`Upload/Download`上传一张临时图片，用于获取该存储桶所在的服务器区域。

在左侧菜单`Browse Files`进入刚刚的存储桶并找到上传的文件，单击查看详细信息。记录下`Frendly URL`行显示的内容。

![图片详细信息](https://img.kylericardo.com/2022-11-28-img_detail-f39f3d3dc33bc6a2e5b674b2b16a88fd.png)

比如我这边可以看到我们的存储桶位于`https://f004.backblazeb2.com/`下，而`/file/kyle-tutorial-bucket/hutao.png`则是固定前缀+桶名称+文件名。这些值我们后面配置Cloudflare时会用到。

![添加App Key](https://img.kylericardo.com/2022-11-28-add_app_key-2efdb836ba559c4ae97b67075c0218a1.png)

然后，我们要在Backblaze控制台左侧的App Keys选项卡中，点进去，然后右侧点击`Add a New Application Key`，新建一个App Key。**注意，这里不建议创建Master Application Key，因为它拥有所有权限。我们尽量遵循最小权限法则。**Key的名字随意，我这边就写picgo。给存储桶赋权的话，选All即可，如果你有多个存储桶，也可以只选你作为图床的那个。授权类型，默认为读写，不用修改。文件名前缀留空。持续时间的话，这里填写86400000，表示1000天（Backblaze的最大值）。也可以根据自己的安全需要来设置。填完后，点击`Create New Key`即可创建。创建好后，当前页面会显示仅出现一次的密钥，将它复制后粘贴在某个位置，保存好。

![缓存时间修改](https://img.kylericardo.com/2022-11-28-modify_cache_control-81f5ded77935bf426117518f3873a81d.png)

另外，我们需要配置下存储桶的设置，把缓存时间改长一些，这样Cloudflare更好命中。**注意，回源时为CDN节点回源站重新拉去数据，然后再传递给用户，并不是将源站地址直接转给用户，所以无需担心回源过多导致的免费流量配额消耗完毕。max-age可以不用太长，太长的话若源文件发生更改，且站点没有主动推送到CDN节点时会导致用户不能及时得到最新版本。**



## 配置Cloudflare

首先，确保你的域名已经[交由Cloudflare管理](https://developers.cloudflare.com/fundamentals/get-started/setup/add-site/)，或者直接在Cloudflare注册。

如果你的域名不是在Cloudflare注册的，其实就是到你的注册商，将DNS解析服务设置为Cloudflare提供的两个地址即可。

然后，登录到[Cloudflare控制台](https://dash.cloudflare.com/)。点击左侧Websites选项卡，后边应该会列出Cloudflare管理的网站。我们点进去。进去后第一步，点击左侧SSL选项卡，修改SSL加密模式，默认是`Flexible`，在这里要改为`Full`，因为Backblaze只提供HTTPS服务，80端口不会响应。这里如果是`Flexible`，后面会访问不到Backblaze，此处为一大坑。

![修改SSL模式](https://img.kylericardo.com/2022-11-30-modify_ssl_mode-c9193afff0c3b3a052eb20313fe4defd.png)

下一步我们给我们的域名上一个CNAME解析。二级域名可以根据自己喜好来定，不一定要参照我的。给出几个常用示例：

- cdn

- oss
- img
- images
- assets
- static

![添加DNS解析](https://img.kylericardo.com/2022-11-28-add_dns_record-24b96c1c3b68370fa2cbea2d943dbda5.png)

我这里就选img作为前缀了。配置好后，等待DNS生效，我们把上面Backblaze里记录的`Friendly URL`的Hostname换成我们的域名，后面的path不变。来看看效果：

![Cloudflare缓存命中](https://img.kylericardo.com/2022-11-28-cf_cache_hit-00b9c03b3c92d5a47a04052fcfa6420e.png)

可以看到，用我们自己的域名，成功打开了图片，并且在控制台中，我们可以看到`cf-cache-status`的状态为`HIT`，表示命中了CF的缓存。

其实到这一步，图床已经是可以使用的状态了，但是还有两个问题没解决：

- 图片的地址暴露了图床原始真实地址，容易遭遇流量攻击。
- 上传图片需要登录Backblaze，很不方便。

针对地址的保护问题，我们使用Cloudflare的Transform Rules来解决。

在Cloudflare控制台里选中我们要编辑的网站后，左侧点击Rules->Transform Rules选项卡。然后点击右侧的`Create transform rule`下拉按钮，选择`Rewrite URL`。

按下图填写即可。

![Transform Rule](https://img.kylericardo.com/2022-11-28-transform_rule-4284d721d231f86bed451c63196ee93b.png)

这里解释下为什么这样填。

首先是两个匹配规则，第一个，是匹配主机名称。表示来源是`img.kylericardo.com`的请求需要改写。

但由于改写后，主机名还是不变，为了避免循环改写，我们再加一条判断。下面这个URL完整路径，如果包含已经改写过的内容，就跳过了。

下面我们需要改写的是Path，不是Query。改写是动态的，因为文件名是变化的。具体可以参考[官方文档](https://developers.cloudflare.com/rules/transform/url-rewrite/examples/#rewrite-path-of-archived-blog-posts)。

这个`concat("/file/kyle-tutorial-bucket", http.request.uri.path)`表示，把第一个参数的内容与path连接起来，作为新的path。注意这里是`uri`不是`url`，写错了会保存不了。

这样我们就不必在地址中暴露我们真实的存储桶名称了。

下面我们再试试用新的链接来打开图片：

![新的重写链接](https://img.kylericardo.com/2022-11-28-new_rewrite_address-49ddacc626708863383c5e1c356fc267.png)

OK，完美！

## 配合PicGo图床工具食用

老是打开网页来上传图片怎么行，当然不能少了趁手的工具！PicGo作为一个跨平台的图床工具，在GitHub上拥有18.9k的star，没有理由不考虑这个。

在[官网](https://picgo.github.io/PicGo-Doc/zh/guide/#%E4%B8%8B%E8%BD%BD%E5%AE%89%E8%A3%85)下载好后，安装，启动。

然后打开主界面，点击左侧插件设置，搜索S3，然后安装S3的插件。至于为什么是S3，因为Backblaze是兼容S3的API，非常方便。

在左侧PicGo设置中，拉到最下面，可以把除了S3的其他图床都关掉（要用的话再打开）。

最后，在左侧图床设置中，找到Amazon S3，然后按下图填写。注意把内容换成你自己的。

![S3设置](https://img.kylericardo.com/2022-11-28-s3_config-9621190161d9ab1160932d1b4fc5a86e.png)

其中，应用密钥ID，是Backblaze控制台里的`keyID`，应用密钥是那个上面只出现一次的，让你保存好的密钥。桶就是你的存储桶名称。文件路径，这里要参考[S3插件的说明](https://github.com/wayjam/picgo-plugin-s3)。我这里用到了年月日、文件名和MD5摘要。可以根据自己的需要来设置，最简单的就是只要一个MD5加个文件后缀就行。

**大坑来了**，这里的自定义节点，填的是控制台Buckets选项卡中，你的桶的信息卡片中的Endpoint。但是，要自己加上`https://`前缀，不然上传图片会一直失败。这是笔者觉得不合理的一点，已经向作者提了[Issue](https://github.com/wayjam/picgo-plugin-s3/issues/18)。

最后的自定义域名，就是之前你在Cloudflare里设置的那个CNAME。也是上面验证时用的。这个就不多解释了。

其他选项默认即可。然后点击确定。因为只配置了一个图床，所以自动设为默认图床。

现在将PicGo激活`上传区`选项卡。然后拖拽一个图片进去，就能上传成功并将Markdown用的链接放到了剪贴板。在Markdown编辑器里直接粘贴就行了。

![Typora设置](https://img.kylericardo.com/2022-11-28-typora_config-73c318ee33647b0d7856747b252fa62f.png)

当然也可以使用剪贴板上传的方式，配合只有MD5的文件名比较好使。这种方式的话，可以在Typora里设置上传服务为PicGo并指定PicGo的二进制文件位置。配置好后，可以先验证一下是否成功。然后截图->在Typora里粘贴，就自动上传到图床了，是不是爽爆？

## 总结

整体配置起来难度不大，还算方便。注意两个大坑即可：

- Cloudflare的SSL要设置为严格。
- PicGo的S3插件的Endpoint要加上`https://`前缀。

注意好这两点，一般问题不大。







