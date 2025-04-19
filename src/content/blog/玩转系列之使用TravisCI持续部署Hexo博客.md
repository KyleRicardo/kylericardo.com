---
title: 玩转系列之使用TravisCI持续部署Hexo博客
date: 2019-04-11 18:04:21
categories:
- 玩转系列
- 博客搭建
tags:
- GitHub Pages
- Hexo
- CI
- Travis
---

目前网上提供写博客的位置已经非常多了。常见的有新浪博客，网易博客等。还有程序员比较喜欢的CSDN博客。但是这些博客有个共同点就是受限于运营商，很多东西都无法自定义，有很多内容还面临被各种审核的尴尬境地。所以很多人选择自己搭建一个博客，如果自己有一个云服务器，那么多半使用了WordPress或者Typecho来驱动，但其实GitHub Pages功能已经为我们提供了很多方便，一般的小型个人博客，使用Hexo配合GitHub Pages进行驱动已经非常足够了，而且有很多免费开源的主题可供使用。下面我就来介绍一下如何使用Hexo+GitHub Pages+TravisCI来搭建个人博客。

<!--more-->

## 准备工作

为了使用GitHub Pages搭建个人博客，你需要：

* GitHub账号（小老板你很皮啊，没有GitHub账号怎么用GitHub Pages?）
* Travis-CI账号（可以使用GitHub账号登录）
* 在Windows下面[安装git](https://git-scm.com/download/win)，注意32位和64位对应你的操作系统版本，别选错
* 在计算机安装[Node.js](https://nodejs.org/en/)环境，因为后面要用到组件npm，并且Hexo是基于Node.js的框架
* 使用npm安装hexo博客框架
* Markdown文本编辑器。墙裂推荐[Typora](https://typora.io/)，用过这个都不想用其他的了
* 一个可用的域名【可选，没有的话使用GitHub Pages默认域名，有的话可以自定义】

## 开始搭建

为了让新手也能明白上述准备工作如何进行，现在将上述内容的要点稍微提一下。

### 注册GitHub账号

直接到[GitHub官网](https://github.com)注册一个账号。步骤非常简单，点击Sign up后，一步步按说明走就可以了。

### 新建一个用于搭建博客的仓库

注册账号登录进去后，点右上角的+号图标，点击New Repository来到新建仓库的页面，在这里我们只用填写仓库名称（Repository name）就可以了，其他全部默认。

注意，用于搭建博客的仓库名是有严格格式要求的。格式必须为：

```
yourname.github.io
```

其中，yourname是你用于登录GitHub的用户名，小写即可。后面的`.github.io`不允许修改，尤其是`.io`千万不能想当然改成`.com`。

比如我的GitHub用户名是KyleRicardo，那么我的仓库名应填写为`kylericardo.github.io`。

填写完这一项内容之后，就可以点击下方的Create repository按钮创建仓库了。

### 在Windows下面安装Git

通过点击[安装git](https://git-scm.com/download/win)这个链接，网站应该会自动检测你的操作系统版本并开始下载安装包了。

安装过程中，大多数内容无需修改，一路默认即可。

安装好后，右键菜单应该会多出两项内容，Git GUI Here和Git Bash Here，我们一般用Git Bash就够了，GUI反而一般用不上。

受篇幅限制，关于Git的使用在这里就不过多赘述了，请多多查阅其他资料。

### 本地初始化你的Git仓库

由于Hexo的Deploy部署功能是将渲染好的网页文档上传至GitHub仓库，所以我们的博客源文件一般情况下无法通过Hexo上传至GitHub以便我们在多台设备之间进行博客的撰写，或者重装机器之后不小心丢失源文件然后又要重新部署一遍博客。（血泪史啊。。。）

时隔几年，随着知识水平的不断提高，笔者了解到，想要随时随地只需一个Git就能写博客，无需繁琐的Nodejs和Hexo环境安装的话，可以使用持续集成（CI）技术。Travis-CI作为一个著名的CI服务提供商，可以对所有的开源GitHub托管项目（即公有仓库）提供免费的持续集成服务。我们可以只把我们写好的md格式博客push到源文件分支下，让Travis自动帮我们安装Nodejs和Hexo环境，渲染好静态页面，然后push到master分支，实现从源码到网页的部署。整个过程轻松愉快。下面听我慢慢道来。

所以这里的初始化，我们仅仅只在刚刚新建的仓库下新建一个hexo分支即可。

```bash
$ git clone https://github.com/username/username.github.io.git
$ git checkout -b hexo
$ git push origin hexo
```

注意，上面的username还是你的GitHub用户名。

### 安装Node.js和npm

没什么好说的，在[Node.js官网](https://nodejs.org/en/)找到LTS（长期支持）版本，下载安装，选择全部组件。**记得勾选`Add to PATH`**。添加到环境变量。

打开命令提示符，输入`node -v`，如果安装正常，你应该能看到`v10.15.0`这样的输出。

那么npm是什么呢。其实就是`Node.js Package Manager`即Node.js的包管理工具。具体什么是包管理工具呢，大家还是百度一下吧。简单的说有点像ubuntu的apt-get，负责添加和删除各种Node.js的组件。

npm在哪呢？其实安装Node.js的时候npm已经安装好了。不信我们试试在cmd中输入`npm -v`看看：

```bash
$ npm -v
6.9.0
```

输出了npm的版本号。这样就成功了，后面会用到npm这个工具。

#### 设置npm淘宝镜像

使用npm之前需要设置一下npm使用国内的淘宝镜像，否则安装依赖的时候非常慢，方法如下：

```bash
$ npm config set registry https://registry.npm.taobao.org
```

一条命令解决。

### 安装hexo框架

其实这里最好的方法是参见[Hexo官方文档](https://hexo.io/zh-cn/docs/index.html)。它说的可比我要好多了。完成了上面的步骤之后，我们只要在任意位置右键打开Git Bash，然后输入

```bash
$ npm install -g hexo-cli
```

即可装好hexo。

然后我们找一个喜欢的位置开始使用hexo建站。（目录路径不要太复杂，最好不要有中文，不要有一些奇怪的特殊符号。一般我喜欢直接在磁盘根目录。）

```bash
$ hexo init hexo
$ cd hexo
$ npm i
```

建立完成后，hexo文件夹的结构应该如下：

```
.
├── _config.yml
├── package.json
├── scaffolds
├── source
|   ├── _drafts
|   └── _posts
└── themes
```

#### 配置站点样式 _config.yml

重点关注几个参数：

{% note danger %}

##### 千万注意

填写时，要注意英文冒号后面要严格跟随一个英文半角空格，否则会解析错误。

当参数是字符串，而且中间有空格时，要用英文双引号引起来。这些是YAML的语法。

{% endnote %}

* title - 你的网站标题
* subtitle - 你的网站副标题，与标题一起影响SEO结果
* description - 你网站的描述，中间可以使用`<br />`标签换行
* keywords - 网站关键词，SEO相关
* author - 网站作者，博客撰写者
* language - 显式指定网站语言，通常与i18n的主题有关，这里直接填写`zh-CN`
* url - 网站网址，如果后面你绑定你自己的域名，就填写自己域名，否则填写`username.github.io`
* permalink - 博文永久链接样式，一般默认即可，你也可以按照需求定制
* timezone - 时区，这里填写`Asia/Shanghai`
* theme - 选择你的网站主题。墙裂推荐NexT主题。后面会说明。填写`next`
* deploy - 部署方式和位置。后面会细说。

### 安装主题（以NexT为例）

在这里墙裂推荐NexT主题。非常简约，却又不失优雅。目前已经更新到7.1.0版本，Git仓库已经迁移。

安装方法：

在hexo文件夹下，使用Git Bash，然后输入命令：

```bash
$ git clone https://github.com/theme-next/hexo-theme-next themes/next
```

NexT主题的官方文档在[这里](<https://theme-next.org/docs/>)。新版的官网暂时没有i18n，只有英文，后面我会把重要的配置项一一说明。

### 本地测试

安装好上述内容后，可以尝试本地浏览一下自己的博客了。方法：

```bash
$ hexo clean && hexo g && hexo s
```

三条命令的作用分别为清理工作区，生成渲染文档，启动并监听本地服务器。

现在我们用浏览器打开`localhost:4000`欣赏一下自己的博客页面吧。

## 页面准备

### 准备主题的标签、分类、关于页面

#### 标签（tags）页面

在Git Bash中，定位到Hexo站点目录。使用下面的命令：

```bash
$ hexo new page tags
```

编辑刚刚新建的页面，将页面类型设置为tags，并禁用该页面的评论，内容留空即可。

```yaml
title: 标签
date: 2019-04-11 22:31:07
type: "tags"
comments: false
```

#### 分类（categories）页面

在Git Bash中，定位到Hexo站点目录。使用下面的命令：

```bash
$ hexo new page categories
```

编辑刚刚新建的页面，将页面类型设置为categories，并禁用该页面的评论，内容留空即可。

```yaml
title: 分类
date: 2019-04-11 22:31:07
type: "categories"
comments: false
```

#### 关于（about）页面

在Git Bash中，定位到Hexo站点目录。使用下面的命令：

```bash
$ hexo new page about
```

编辑刚刚新建的页面，禁用该页面的评论。

```yaml
title: 关于
date: 2019-04-11 22:31:07
comments: false
```

然后可以在下面用Markdown写作关于自己的东西了。

### 开始写作

在站点目录，执行下列命令：

```bash
$ hexo new "Article Title"
```

引号内填写自己的文章标题就可以了。

然后使用Markdown文本编辑器来撰写刚刚新建的文章就可以了。

在以后，没有hexo环境的时候，在`source\_posts\`目录下新建一个md文件进行写作就可以了，YAML的metadata部分可以从已存在的博文的md拷贝过去然后改改。

## 主题配置

推荐使用Visual Studio Code编辑器进行编辑。

### 重点注意

{% note danger %}

##### 千万注意

站点和主题各有自己的一套配置`_config.yml`，分别位于根目录和`themes/next`下，一定要分清楚。

{% endnote %}

### 选择布局方案（子主题）

布局方案是NexT支持的功能，使用布局方案，NexT为您提供不同的视图。几乎所有配置都可以被这些方案使用。到目前为止，NexT支持4种方案，它们是：

- **Muse**→默认方案，这是NexT的初始版本。使用黑白色调，大体上看起来非常整洁。
- `Mist` →Muse的紧凑版，使用了整洁的单列视图。
- `Pisces` →双栏布局，如同邻家少女般有活力。
- `Gemini` →看起来像Pisces，但有不同的带阴影的列块，对视图更敏感。

您可以通过编辑主题配置文件，搜索scheme关键字来更改方案 。您将看到4行方案设置，可以通过注释和取消注释来启用其中一个。

笔者推荐使用Gemini方案。

```yaml
#scheme: Muse
#scheme: Mist
#scheme: Pisces
scheme: Gemini
```

### 选择语言

编辑站点配置文件，将值设置为`language`您需要的语言。这里我们修改为简体中文：

```yaml
language: zh-CN
```

配置菜单项

菜单设置项的格式`Key: /link/ || icon`包含3个值：



## 使用Travis-CI实现持续集成与持续交付



## 域名自定义

上述过程搞完之后，一般是通过`username.github.io`来访问你的博客。虽然已经可以了，但是我们有时候还想有个性一点。那么就需要自己掏钱购买一个域名，然后将你的自定义域名绑定到你的博客。

### 域名提供商方面

域名推荐在阿里云购买，因为备案比较方便，这不是广告。而且以后如果你以后购买服务器ECS的话，配套使用更加方便。以后或许会出图床的使用教程。购买域名后，你需要在你的域名提供商的管理页面中对你的域名进行解析。解析的方式要设置为CNAME方式（别名），具体如何操作请参见其他文档。

### GitHub Pages方面

仅仅只在域名提供商方面进行解析是不够的，还要在你的源文件中进行操作。方法是在站点目录hexo下的source文件夹下面新建一个名为`CNAME`的空白文档（一定要大写，而且没有后缀名），用文本编辑器打开，然后输入你想使用的别名域名地址。比如这个博客的地址为`blog.wble.team`，那么在CNAME中的内容就应该为`blog.wble.team`，不要包含http或者https前缀。

这样设置之后，就可以使用你的自定义域名访问你的博客了。是不是觉得很帅呢？

## 后记

目前想到的就这么多吧。如果有什么需要补充的，后面再添加。

May the force be with you.
