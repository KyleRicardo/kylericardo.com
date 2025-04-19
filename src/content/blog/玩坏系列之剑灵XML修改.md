---
title: 玩坏系列之剑灵XML修改
date: 2017-04-05 14:10:33
categories: 
- [玩坏系列, 游戏修改]
tags:
- 剑灵
- XML修改
---

今天应某好友的要求，简单说下剑灵Xml.dat的修改流程吧，其实有了官方的工具也蛮无脑的，网上流传的很多工具、脚本，包括我写的一些小项目，说白了也就是简单包装一下这枯燥乏味的workflow罢了，无论原理是匿名管道还是根据源码二次开发。

<!--more-->

## 工具

至于工具嘛，我就直接打包到百度云吧。[点我下载](http://pan.baidu.com/s/1c1G4pzi) 密码：v07y

压缩包内容目录：

- bnsdat.exe - 这是官方开发的xml打包解包工具，是一切关于xml.dat作弊的核心，网上流传的所有项目都是对该程序进行的二次开发（包装或加工）
- 解包.bat - 这是简单包装的一个bat脚本，作用是对当前目录下的xml.dat进行解包，解包后将在当前目录下创建一个xml.dat.files子目录，所有解包后的文件都将在这个目录下
- 打包.bat - 这是简单包装的一个bat脚本，作用是将xml.dat.files这个目录及其所包含的所有文件都打包到xml.dat文件中。

另外，这里推荐一个编辑器，用于下面更改xml。[点我下载Notepad++](https://notepad-plus-plus.org/repository/7.x/7.5.4/npp.7.5.4.Installer.exe)

上面给出的是官方链接，非常小巧，放心安装。安装完之后会有个右键菜单，右键xml文件即可编辑。

## 教程

这里简单说下步骤。大致分为开始->备份->解包->手动修改xml达到作弊目的->重新打包->替换原游戏xml.dat->结束。

### 备份

请手动将原游戏目录中的xml.dat备份一遍，无论备份到哪。

### 解包

手动双击`解包.bat`文件，静待进度走完即可。

### 重点：手动修改xml

进入xml.dat.files文件夹，找到client.config2.xml文件，在上面右键，然后选择`Edit with Notepad++`，如此打开Notepad++编辑器。

说几个重点需要修改的地方。

#### 6人DPS伤害统计

`Ctrl+F`打开搜索对话框，输入关键词`show-party-6`搜索，到达键值

`<option name="show-party-6-dungeon-and-cave" value="n"/>`

在这里把`n`替换为`y`，即修改为

`<option name="show-party-6-dungeon-and-cave" value="y"/>`

这样就开启了6人DPS伤害统计了。

#### 小头目伤害统计

同上，搜索关键词`show-jackpot`，到达键值

`<option name="show-jackpot-boss-zone" value="n"/>`

同样把`n`替换为`y`，即修改为

`<option name="show-jackpot-boss-zone" value="y"/>`

这样就开启了小头目伤害统计了。

#### 乳摇功能

搜索关键词`breast`，到达键值

`<option name="no-use-breast-physics" value="true"/>`

将`true`改为`false`即可实现乳摇功能。

#### 技能公共CD调整

这个可能是很多人比较关注的问题，请适当操作，个人感觉没有卵用。

搜索关键词`skill-global`，到达键值

`<option name="skill-global-cool-latency-time" value="100"/>`

把这里的`100`替换为你想要的数值（0~255）即可。具体效果请自行测试。

### 重新打包

手动双击`打包.bat`文件，静待进度走完即可。

### 替换原xml.dat文件

这个不用多说吧。把重新打包生成的xml.dat文件覆盖到游戏目录下。整个过程到此结束，上游戏体验吧。

## 说明

- 使用该方法达到的游戏修改和作弊效果仅供研究，后果自负，本人概不承担责任。
- 后面空闲时期可能会开发出更方便的工具，研究更多xml.dat修改的作弊效果。
- 就这样，祝好。
