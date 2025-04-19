---
title: 玩转系列之MentoHUST交叉编译ipk包
date: 2017-03-29 14:30:14
categories:
- 玩转系列
- OpenWrt
tags:
- MentoHUST
- 交叉编译
---

这是一个积累了很长时间的项目。从2014年起，就陆续在折腾这些东西，期间还自己写了一个基于OpenWrt的神州数码客户端[802.1X Evasi0n](https://github.com/KyleRicardo/802.1X-Evasi0n)，服役了大半年的时间，表现良好，内存占用小，工作效率高。后来，学校所有神州数码服务器全部换成了锐捷，导致我的项目失去了光彩，我又翻出了大名鼎鼎的MentoHUST，在反复折腾交叉编译和功能性修补过程中，有了这样一个版本。该版本非常适合于在OpenWrt的SDK环境下编译出MentoHUST的ipk包。

<!--more-->

## 特点

- 修复了原MentoHUST在shell下由于libiconv库编译或工作不正常导致的反馈信息乱码问题
- 去除了libiconv库的依赖，加入了轻量级的strnormalize库，GBK to UTF-8转换良好
- 去除configure等冗余文件，仅保留核心src源码文件
- ./src/Makefile中使用通配符`*`指代libpcap版本，通用性更强
- 无需手动配置环境变量，无需使用automake和configure生成所需Makefile
- 重新完全手动编写./和./src/目录下的Makefile，保证编译的有效性
- 无`--disable-notify --disable-encodepass`等配置，保证原汁原味
- 无手动`#define NO_DYLOAD`补丁，使用动态加载库函数，ipk包更小，并且更容易编译

## PreOperation

### 预备知识

> 这里的编译是指交叉编译。所谓交叉编译，简单地说，就是在一个平台上生成另一个平台上的可执行代码。这里需要注意的是所谓 平台，实际上包含两个概念：体系结构（Architecture）、操作系统（Operating System）。同一个体系结构可以运行不同的操作系统；同样，同一个操作系统也可以在不同的体系结构上运行。
> 交叉编译通常是不得已而为之，有时是因为目的平台上不允许或不能够安装我们所需要的编译器，而我们又需要这个编译器的某些特征；有时是因为目的平台上的资源贫乏，无法运行我们所需要编译器；有时又是因为目的平台还没有建立，连操作系统都没有，根本谈不上运行什么编译器。
>
> OpenWrt系统是基于Linux平台的操作系统，故我们需要用到Linux的操作系统平台进行交叉编译。但由于种种原因，我们的电脑不可能使用Linux操作系统，但又要交叉编译，怎么办呢？这时候就需要用到虚拟机了。

### 需要的工具

- VMWare Workstation虚拟机工具
- 一个Ubuntu Linux镜像（版本无所谓，笔者用的是15.04版本 x86）
- OpenWrt SDK（**不建议**自行从网上下载，建议直接在Ubuntu中用git clone）
- 本项目的源码

### 虚拟机的安装（Tips）

关于虚拟机，在这里不多赘述，仅提供一些Tips。如果对虚拟机完全不了解，建议不要继续观看本教程，先找百度谷歌充充电。

- 推荐新手使用**Ubuntu**

> 虚拟机的Linux系统推荐使用Ubuntu，对于我们新手来说，这无疑是最适合于我们的系统，图形化的界面很贴心，基本操作上和Windows相差不大，可以较快的熟悉起来。

- 务必安装VMWare Tools工具

> 使用VMWare Workstation装Ubuntu的时候，千万不要选择简易安装，这样在后面安装VMware Tools会非常麻烦。先建立一个空虚拟机，然后再用镜像引导安装，这样就比较好，系统安装好了之后再安装上VMWare Tools你会发现这个Tools有多么方便。其中最大的好处有二：系统分辨率的自动调整和剪贴板的无缝连接。就是说，不管文字或者文件，你在windows里面使用Ctrl+C复制后，可以直接在Ubuntu里面粘贴，反之亦然。这在后面将给我们提供非常大的方便。所以，VMWare Tools必须安装，切记。

- 务必关闭Ubuntu系统屏保

> 还有一点需要提醒的是，安装好后，在右上角“系统”菜单的“首选项”中选择“屏幕保护程序”，然后去掉左下角的“计算机空闲时激活屏幕保护程序”，然后按“关闭”，这个窗口是没有“应用”或“确定”之类的，直接关闭它就会保存。用惯了WINDOWS的用户注意了。为什么要做这步呢？因为整个编译过程中有些步骤要等一段时间的，老是自动启用屏幕保护程序，然后还要重新输密码才能退出，也是麻烦事。开始的时候我忘了设置这一步，后来有一次把黑屏状态的虚拟机唤醒的时候，显卡瞬间崩溃了，虚拟机直接死机，然后编译了好久的数据丢失了，白白浪费了几个小时。这个教训也希望大家引起重视。

## PreCompile

现在进入正题了，首先要做的是配置好SDK的交叉编译环境。

### 获取OpenWrt SDK

首先安装 subversion 和 git，两个应用广泛的源代码管理方案，在此需要这两个工具下载源代码，也就是`svn`和`git`命令。其方法如下：
使用`Ctrl+Alt+T`组合快捷键打开终端，然后在左侧的Dock中，右键单击，将其锁定，方便以后打开。如下图：

[![terminal](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/175734670.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/175734670.png)

打开终端后，在其中输入如下命令：

```
$ sudo apt-get update
$ sudo apt-get install subversion git-core
```

其中，`sudo`是linux系统管理指令，是允许系统管理员让普通用户执行一些或者全部的root命令的一个工具，如`halt`，`reboot`，`su`等等。这样不仅减少了root用户的登录和管理时间，同样也提高了安全性。sudo不是对shell的一个代替，它是面向每个命令的。

`apt-get`是一条linux命令，适用于deb包管理式的操作系统，主要用于自动从互联网的软件仓库中搜索、安装、升级、卸载软件或操作系统。

这两条命令执行后，我们就可以用`svn`或者`git`命令获取所需要的源代码了。

但是，编译源代码还有一些必须的工具和依赖，在这里我们一并安上，这种东西不怕安多了，就怕安少了。执行如下命令：
`$ sudo apt-get install build-essential libncurses5-dev zlib1g-dev gawk flex quilt libssl-dev xsltproc libxml-parser-perl mercurial bzr ecj cvs unzip`

下面就是来获取trunk版本的SDK了，执行命令：
`svn co svn://svn.openwrt.org/openwrt/trunk/`
也可以使用
`git clone git://git.openwrt.org/openwrt.git`

这里还是推荐git，如果你的git访问速度太慢，也可以用svn，或者使用SS代理。用下面两条命令配置好后，保持shadowsocks客户端开启就行了。

```
$ git config --global http.proxy 'socks5://127.0.0.1:1080' 
$ git config --global https.proxy 'socks5://127.0.0.1:1080'
```

shadowsocks的本地端口默认是1080，上面的设置只是开启`https://`代理。

如果要用到git代理，请参看[如何为 Git 设置代理？](https://segmentfault.com/q/1010000000118837)

cd到我们的SDK目录下，这就是OpenWrt开发环境的根目录。后面几乎所有的操作都是在这个目录下进行：

```
$ cd openwrt/
```

可以利用Ubuntu的自动填充，就是输入`cd op`然后按一下Tab键，就会自动填充为上面的命令。记住这一点，以后会经常用到，熟练使用自动填充会节约不少时间。

### 更新feeds

Feeds，也就是软件包列表，是在OpenWrt中共用位置的包的集合。运行以下命令即可更新内置软件包列表并链接到编译工具中：

```
$ ./scripts/feeds update
$ ./scripts/feeds install
```

如果网速不快，可能需要等待一段时间。静待其完成后，我们的软件包就被更新了。

### 添加需要编译的第三方软件包（也就是我们的MentoHUST-OpenWrt-ipk），指定目标架构

这里说一下我的Makefile。
一个工程中的源文件不计其数，其按类型、功能、模块分别放在若干个目录中，Makefile定义了一系列的规则来指定，哪些文件需要先编译，哪些文件需要后编译，哪些文件需要重新编译，甚至于进行更复杂的功能操作，因为 Makefile就像一个Shell脚本一样，其中也可以执行操作系统的命令。

Makefile的语法规则并不算复杂，但是新手研究起来也很头大，也不能静下心来去花时间学习Makefile的写法。我虽然起初不会写Makefile，但是折腾了这么久之后，对于一个Makefile，已经不算什么了。于是github上包含了我写的Makefile，同学们可以直接编译。下个版本可能会发布自动从网上下载源码并编译的Makefile。

原始的mentohust编码转换是使用的libiconv库，这个库问题特别多，效率低，不方便编译，受802.1X Evasi0n项目的启发，我干脆摒弃了libiconv库，使用了strnormalize这个文件代替了它，一次性解决了编码转换问题。所以现在，Makefile里面再也找不到libiconv的依赖了，现在mentohust唯一依赖的库就是libpcap，编译起来也是相当轻松了。

Makefile既然已经包括在源码中，那么我们可以开始配置我们的编译器了。使用命令：

```
$ make menuconfig
```

这个命令会启用图形化的选项，我们在其中进行调节即可。

我们一共要调整三个选项：

> Target System
> Subtarget
> Target Profile

对于极壹，调整好后应该如下图所示：

[![HC6361](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/181649637.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/181649637.png)

对于小米Mini，调整好应该如下图所示：

[![Xiaomi Mini](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/181844447.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/181844447.png)

下面一步，就是把我们要编译的软件包含进去。

在Makefile里面我们已经知道，这个软件包是属于Network里的Ruijie，所以我们在主菜单中找到Network，回车进入

[![Network](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/182127629.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/182127629.png)

找到Ruijie这一项

[![Ruijie](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/182209236.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/182209236.png)

然后到这里

[![mentohust](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/182254613.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/182254613.png)

这里不要按Y选中，Y选中是将其编译到固件中去，我们在这里不是要编译固件，而是要神州数码单独作为一个软件编译出来。所以我们按M键选中，将其编译为一个组件模块(Module)。

用M键选中后，我们用光标键右几次选中Save，保存后，再多次Exit，最终退出这个界面。

[![filename](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/182603447.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/182603447.png)

[![finish-written](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/182629517.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/182629517.png)

### 更新编译必需工具与工具链(编译依赖)

这一步是从官网上获取我们编译所需的工具（如编译器、链接器等），十分关键。不过，命令却十分简单：

`$ make tools/install`

即可编译并安装好我们所需的工具。

`$ make toolchain/install`

即可编译并安装好我们所需的工具链。

为了显示编译过程，我们可以在命令后面加上一个选项：V=s。即：

```
$ make tools/install V=s
$ make toolchain/install V=s
```

注意，V一定要大写。

不幸的是，我发现Tools和Toolchain的编译十分漫长，等待过程十分痛苦。这是因为需要从网上下载大量的文件，而这些镜像源都不是特别好。为了减少等待的时间，不妨给大家分享一个小技巧。通过研究编译的过程我发现，所需的文件是下载并保存到openwrt目录的dl文件夹下的。通过实验，我发现这个dl文件夹可以移植，只要我们的OpenWrt SDK的版本是差不多的，我们可以直接将已经弄好的dl文件夹放在openwrt目录中，这样可以节省大量时间。编译所需的dl文件夹我均已打包上传，请自行下载。

[————百度网盘————](http://pan.baidu.com/s/1o7XKxRk)

下载后，提取压缩包到openwrt 目录，然后可以删掉该压缩包。

同样地，不建议直接将形如

> <http://downloads.openwrt.org/snapshots/trunk/ramips/OpenWrt-Toolchain-ramips-for-mipsel_24kec%2bdsp-gcc-4.8-linaro_uClibc-0.9.33.2.tar.bz2>

的这种文件解压后直接应用于我们的toolchain，因为省略了编译安装过程，后面可能会发生意想不到的错误。dl文件夹我已经提供给大家，Toolchain的编译已经不需要太长时间。不要因小失大。

## Compile

首先，进入SDK目录，然后执行下列命令：

```
$ pushd package
$ git clone https://github.com/KyleRicardo/MentoHUST-OpenWrt-ipk.git
$ popd
```

克隆该git库之后，请再次使用`make menuconfig`，在Network->Ruijie下面找到该软件包，检查是否已经用M将其指定编译为模块，保存，退出。下面可以开始编译了：

`$ make package/MentoHUST-OpenWrt-ipk/compile V=s`

如果顺利，编译完成之后就能在`trunk/bin/YourArchitecture/packages/base`中找到你的ipk包了。还包含其依赖的libpcap.ipk。如果你的路由器默认没有安装libpcap包，可以一并安装。

[![compiled-ipk](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/184846862.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/184846862.png)

## Install

将上面拷贝出来的mentohust及libpcap的ipk，用上面的方法，利用WinSCP上传到路由器的tmp目录。这个操作很简单，这里不再赘述。

使用快捷键`Ctrl+P`打开PuTTY，输入密码(默认是admin)回车后，来到如下界面：

[![putty](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/185701901.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/185701901.png)

然后我们先`cd /tmp/`
然后用opkg命令安装我们所需的软件包：

```
opkg install libpcap_1.7.4-1_ramips_24kec.ipk
opkg install mentohust_0.3.1-1_ramips_24kec.ipk
```

这时有可能会出现这种情况：
[![arch-error](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/185905453.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/185905453.png)

遇到这种错误，需要修改/etc/opkg.conf文件，对于小米Mini，需要在其尾部追加：

```
arch all 1
arch ralink 200
arch ramips_24kec 100
```

这样就能正确地安装了：

[![libpcap](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/190427373.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/190427373.png)

当然，mentohust也可以了：

[![mark](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/190815684.png)](http://7xnkw4.com1.z0.glb.clouddn.com/blog/20170329/190815684.png)

在有些比较老的路由器固件中安装，会有类似这样的错误：

> //usr/lib/opkg/info/mentohust: line 4: default_postinst: not found
> Collected errors:
>
> pkg_run_script: package “mentohust” postinst script returned status 127.
> opkg_configure: mentohust.postinst returned 127.

上述错误原因如下：

因为mentohust是基于 trunk 代码编译，所以目前编译出的ipk 包默认带有
Package/postinst 脚本

```
#!/bin/sh

[ "${IPKG_NO_SCRIPT}" = "1" ] && exit 0

. ${IPKG_INSTROOT}/lib/functions.sh

default_postinst$0 $@
```

Package/prerm 脚本

```
#!/bin/sh

. ${IPKG_INSTROOT}/lib/functions.sh

default_prerm $0$@
```

而若不是最新编译的固件， /lib/functions.sh 中是没有 default_postinst default_prerm函数的，所以会造成 127错误。

临时解决办法：
在PuTTY中，键入如下命令并回车：

`echo -e "\ndefault_postinst() {\n\treturn0\n}\ndefault_prerm() {\n\treturn 0\n}" >> /lib/functions.sh`

注意，这是一条命令，是用echo命令将这段空函数追加到functions.sh文件尾部。
上述错误解决之后，终于可以愉快地安装mentohust了。

## Usage

安装好后可以立即使用，配置文件在`/etc/mentohust.conf`，可以自行编辑。

关于mentohust的用法，想必不用我多说吧。我都已经帮忙帮到这一步了。这里提一下，mentohust未能智能识别路由器WAN口对应的网卡，请手动在mentohust.conf的末尾DHCP脚本中添加自己WAN口对应的网卡。最终脚本类似`udhcpc -i eth1`。

最后，可以将mentohust添加到开机启动，怎么弄不用我多说了吧。

## 已知问题

- mentohust未能智能识别路由器WAN口对应的网卡，请手动在mentohust.conf的末尾DHCP脚本中添加自己WAN口对应的网卡。最终脚本类似`udhcpc -i eth1`
- 暂未加入init.d目录的mentohust脚本，可能下个版本加入。
- 后续可能加入只有一个Makefile，通过自动从git下载源码进行编译的版本