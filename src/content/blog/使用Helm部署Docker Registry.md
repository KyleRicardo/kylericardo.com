---
title: 使用Helm部署Docker Registry
date: 2024-07-02 00:40:00
categories: 
- [玩转系列, DevOps]
tags:
- Helm
- Docker Registry
- K8s
---

先建立名称空间
```bash
kubectl create ns docker-registry
```

## 安全性

使用`htpasswd`生成密码文件
注意使用自己的用户名和密码分别替换`myuser`和`mypasswd`
```bash
mkdir auth

docker run --rm --entrypoint htpasswd registry:latest -Bbn myuser mypasswd > auth/htpasswd
```
创建通用Secret
```bash
kubectl create secret generic registry-auth-secret --from-file=auth/htpasswd -n docker-registry
```

## 持久性

新建持久卷声明

新建文件`registry-pvc.yml`并填充如下内容：
```bash
cat << EOF > registry-pvc.yml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: docker-registry-pvc
  namespace: docker-registry
spec:
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 10Gi
EOF
```

应用更改：
```bash
kubectl apply -f registry-pvc.yml -n docker-registry
```

## 使用Helm安装Registry

```bash
helm repo add twuni https://helm.twun.io
helm repo update
```
可以先看一眼我们要安装的版本：
```bash
helm search repo docker-registry
```

设置配置文件`values.yml`
```yaml
replicaCount: 1
image:
  repository: registry
  tag: 2.8.3
persistence:
  enabled: true
  size: 10Gi # <- adapt this value with the size you want to use
  deleteEnabled: true
  existingClaim: docker-registry-pvc # <- here we specify the pvc we created earlier
secrets:
  htpasswd: mihomo:$2y$05$Wte9n5WeYyhs2iEKPGVLouz.SfhnDqzwoDbGL2e265ZadYZLMQRm6 # <- This is the username / password we created in the security section. You can replace this with your own username and password
ingress:
  enabled: true
  className: cloudflare-tunnel
  path: /
  hosts:
    - registry.example.com
```

安装registry
```bash
helm install -f values.yml docker-registry -n docker-registry twuni/docker-registry
```

## 登录测试

在本地电脑中，使用docker登录：
```bash
$ docker login https://registry.example.com

Username: myuser
Password:

Login Succeeded
```

输入之前设置好的用户名和密码，出现`Login Succeeded`即为登录成功。

下面我们push一个自己的镜像到服务器。

先拉取镜像：
```bash
$ docker pull docker/getting-started

Using default tag: latest
latest: Pulling from docker/getting-started
c158987b0551: Pull complete
1e35f6679fab: Pull complete
cb9626c74200: Pull complete
b6334b6ace34: Pull complete
f1d1c9928c82: Pull complete
9b6f639ec6ea: Pull complete
ee68d3549ec8: Pull complete
33e0cbbb4673: Pull complete
4f7e34c2de10: Pull complete
Digest: sha256:d79336f4812b6547a53e735480dde67f8f8f7071b414fbd9297609ffb989abc1
Status: Downloaded newer image for docker/getting-started:latest
docker.io/docker/getting-started:latest

What's next:
    View a summary of image vulnerabilities and recommendations → docker scout quickview docker/getting-started
```

然后重新打个标签：
```bash
$ docker tag docker/getting-started registry.mihomo.dev/genshin-getting-started
```

最后，推送：
```bash
$ docker push registry.example.com/genshin-getting-started

Using default tag: latest
The push refers to repository [registry.example.com/genshin-getting-started]
f04c024ad025: Pushed
6dd65fb1af16: Pushed
9e173cdce044: Pushed
f2d47996fdfa: Pushed
c23f26e962bd: Pushed
0511ab7e6edc: Pushed
ec7e4a91c33b: Pushed
1fee4bd55a85: Pushed
ded7a220bb05: Pushed
latest: digest: sha256:91a5104fb44df9af32367f09b08ed1ac128679ec5c31115c610206340656e183 size: 2203
```

## 使用私有镜像部署

刚刚我们上传了私有镜像到我们自建的Registry，现在我们来试试用k8s部署这个私有镜像。

### 新建测试命名空间
```bash
kubectl create ns test
```

### 新建用于Docker Registry的保密字典

> 注意这里的命令是`kubectl create secret docker-registry`
> `secret`的类型是`docker-registry`而不是`generic`

```bash
kubectl create secret docker-registry registry-credentials --docker-server=registry.example.org --docker-username=myuser --docker-password=mypasswd -n test
```

### 部署镜像

准备就绪，现在我们开始进行部署。
新建一个Manifest，名为`test.yml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: genshin-getting-started
  namespace: test
spec:
  selector:
    matchLabels:
      app: genshin
  replicas: 1
  template:
    metadata:
      labels:
        app: genshin
    spec:
      containers:
        - name: getting-started
          image: registry.example.org/genshin-getting-started
          ports:
            - containerPort: 80
      imagePullSecrets:
        - name: registry-credentials # <- This point to the secret we created earlier so we can authenticate against the registry.
```

启动部署：
```bash
kubectl apply -f test.yml
```

观察pod：
```bash
$ kubectl get po -n test
NAME                                       READY   STATUS    RESTARTS   AGE
genshin-getting-started-7667d6fddf-6rqbq   1/1     Running   0          6s
```

查看pod详细信息：
```bash
kubectl describe po genshin-getting-started-7667d6fddf-6rqbq -n test
```
可以看到最后的Events：
```bash
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  24s   default-scheduler  Successfully assigned test/genshin-getting-started-7667d6fddf-6rqbq to oracle
  Normal  Pulling    24s   kubelet            Pulling image "registry.example.com/genshin-getting-started"
  Normal  Pulled     24s   kubelet            Successfully pulled image "registry.example.com/genshin-getting-started" in 394ms (394ms including waiting)
  Normal  Created    24s   kubelet            Created container getting-started
  Normal  Started    24s   kubelet            Started container getting-started
```
显示成功拉取镜像，大功告成。
