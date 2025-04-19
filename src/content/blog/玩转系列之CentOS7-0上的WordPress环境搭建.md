---
title: 玩转系列之CentOS7.0上的WordPress环境搭建
date: 2017-03-28 14:40:27
categories:
- 玩转系列
tags:
- CentOS
- WordPress
---

最近，笔者正需要在**CentOS 7.0**系统上搭建**WordPress**博客环境，由于是零基础，导致期间遇到很多棘手的问题，也多走了很多弯路，现特将正确的步骤详细地记录下来，以便读者查阅，同时方便自己日后回顾。

<!--more-->

------

## 0x0 准备工作

在搭建环境之前，你需要准备以下内容：

- 云服务器一枚（笔者为阿里云ECS），已安装好纯净版CentOS7镜像

- 一个能够正常使用的域名

- [XShell工具](http://pan.baidu.com/s/1nvsePHB) - 使用SSH终端连接并管理服务器

- [XFtp工具](http://pan.baidu.com/s/1o8lrqvo) - 使用SFTP协议上传和下载服务器文件

- [WordPress镜像包(Zip格式)](https://cn.wordpress.org/wordpress-4.9.1-zh_CN.zip)

  为了方便使用，笔者在这里提供两枚密钥（网上搜集）：

  > Xshell 5 注册码： 690313-111999-999313
  > Xftp 5 注册码： 101210-450789-147200

  这两款软件都非常好用，对于学生用户是免费的，如果用于商业用途，还请支持正版。

## 0x1 配置云服务器

### Setp 1 使用yum工具安装LAMP环境

所谓LAMP环境，就是Linux Apache+MySQL+PHP环境，其实就是把Apache，MySQL以及PHP安装在Linux系统上，组成一个环境来运行php脚本语言。

操作步骤如下：

使用XShell连接到服务器，默认用户名为root，密码为创建服务器镜像时设定的密码。登录成功后如下图：

图片1

安装epel

`$ yum install epel-release`

清除缓存目录下的软件包及旧的headers

`$ yum clean all`

安装基本组件（Apache MariaDB/MySQL PHP）

`$ yum install wget unzip httpd mariadb-server mariadb php php-mbstring php-mysql php-gd phpmyadmin`

### Step 2 配置MariaDB

启动MariaDB服务 `systemctl start mariadb`
让MariaDB服务开机启动 `systemctl enable mariadb`
打开MariaDB设置向导 `mysql_secure_installation`

设置向导具体内容请参见[MySQL安全配置向导mysql_secure_installation](http://blog.csdn.net/fophp/article/details/52926817)

现在可以登录到数据库了

`$ mysql -u root -p`
输入密码后就登录到了MariaDB，然后执行下面的命令(不要丢掉末尾的分号)：

```
MariaDB>CREATE DATABASE wordpress;
MariaDB>CREATE USER 'wpusr'@'localhost' IDENTIFIED BY 'wppwd';
MariaDB>GRANT ALL PRIVILEGES ON wordpress.* TO 'wp'@'localhost';
MariaDB>FLUSH PRIVILEGES;
MariaDB>exit;
```

以上代码的意思请自行根据字面意思理解。其中第二行数据库账户用户名wpusr和密码wppwd可以自行修改

### Step 3 配置phpMyAdmin

因为Vim编辑器对于初学者来说有点痛苦，这里使用稍微麻烦点的方法，使用XFtp把配置文件拷贝到本地编辑后，再上传至服务器。

登录XFtp，用户名密码同XShell，记得协议使用**SFTP**。

推荐本地编辑器为Notepad++，具体复制粘贴过程不再详述。

配置文件为`/etc/httpd/conf.d/phpMyAdmin.conf`

将文件中`<Directory /usr/share/phpMyAdmin/>`项下的

```
Require ip 127.0.0.1
Require ip ::1
```

替换为

```
Require all granted
```

然后重启Apache

`systemctl restart httpd`
`systemctl enable httpd`

### Step 4 初始化WordPress

将上面下载好的WordPress(Zip包)通过XFtp拷贝到服务器`/var/www/html`目录

`$ cd /var/www/html`
`$ unzip wordpress-4.7.3-zh_CN.zip`
`$ rm -rf wordpress-4.7.3-zh_CN.zip`
修改目录所有者：`chown apache: /var/www/html/* -R`

将你的域名解析到你的服务器IP地址，解析类型为A类型。

访问`http://yourdomain/wordpress`来进入WordPress配置向导，按照提示进行操作即可。

## 0x2 配置WordPress

### Step 1 开启Apache的Rewrite功能（301重定向）

Rewrite模块功能是美化WordPress链接地址和设置网站二级域名的基础，然而此模块在Apache的设置中默认是没有打开的，需要我们手动打开。

在`/etc/httpd/conf/httpd.conf`文件中找到
`LoadModule rewrite_module modules/mod_rewrite.so`
将前面的#去掉，如果不存在，找到
`Include conf.modules.d/*.conf`这句，在下一行添加上
`LoadModule rewrite_module modules/mod_rewrite.so`

继续，找到`<Directory "/var/www/html">`这一节点，修改里面的非注释内容为：

```
Options Indexes FollowSymLinks
AllowOverride All
Order allow,deny
Allow from all
Require all granted
```

主要是将`AllowOverride None`修改为`AllowOverride All`

保存，上传，覆盖。

你的WP博客的地址默认就是`http://yourdomain/wordpress`，如果你想把它重定向到二级域名，比如`http://blog.yourdomain.com/`怎么办呢？

首先你需要将blog前缀的域名解析到你的IP（当然你设置泛解析也行），然后在`var/www/html`目录新建一个.htaccess文件，内容如下：

```
RewriteEngine on
# 这里？后面请填上你要绑定的域名
RewriteCond %{HTTP_HOST} ^(www.)?blog.wble.team$
# 把WordPress改成要绑定的目录
RewriteCond %{REQUEST_URI} !^/wordpress/
# 不要改以下两行
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
# 把WordPress改为要绑定的目录
RewriteRule ^(.*)$ /wordpress/$1
# 确定域名和绑定目录，同上
# wordpress/后面是首页文件index.php, index.html之类
RewriteCond %{HTTP_HOST} ^(www.)?blog.wble.team$
RewriteRule ^(/)?$ wordpress/index.php
```

然后重启服务器`systemctl restart httpd`,二级域名就可以使用了。

现在，进入仪表盘，单击设置-常规，将**WordPress地址**和**站点地址**两项都改成你的访问域名（http://blog.yourdomain.com）。

## 0x3 结束

教程基本就到这里，有什么想到的我再添加。