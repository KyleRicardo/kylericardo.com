---
title: 从零开始部署k3s + KubeSphere
date: 2024-07-01 21:16:33
categories: 
- [玩转系列, DevOps]
tags:
- k3s
- KubeSphere
---

## 安装k3s

安装前，需要先设定好hostname：
```bash
hostnamectl set-hostname oracle
```
然后安装k3s：
```bash
curl -sfL https://get.k3s.io | sh -
```
网络条件没问题的情况下，安装应该很快，稍等片刻就好。
由于k3s的配置文件在`/etc/rancher/k3s/k3s.yaml`里，不同于k8s的`$HOME/.kube/config`所以我们需要手动指定一下环境变量，在`.bashrc`里添加：
```bash
export KUBECONFIG="/etc/rancher/k3s/k3s.yaml"
```
记得`source`一下，或者重启终端。
现在我们试试安装情况：
```bash
$ kubectl get node
NAME     STATUS   ROLES                  AGE     VERSION
oracle   Ready    control-plane,master   7m15s   v1.29.6+k3s1
```

## 安装kubesphere面板

执行安装命令：
```bash
kubectl apply -f https://github.com/kubesphere/ks-installer/releases/download/v3.4.1/kubesphere-installer.yaml

kubectl apply -f https://github.com/kubesphere/ks-installer/releases/download/v3.4.1/cluster-configuration.yaml
```
查看安装日志：
```bash
kubectl logs -n kubesphere-system $(kubectl get pod -n kubesphere-system -l 'app in (ks-install, ks-installer)' -o jsonpath='{.items[0].metadata.name}') -f
```

安装完毕后，控制台会打出面板的访问地址及管理员密码，可以尝试登录。
![[Pasted image 20240701202424.png]]
注意这里打印的是内网IP，请替换为自己服务器的公网IP。
## 面板公网访问

> 首先需要确保你要公开的域名已经在Cloudflare的管理下，或者是在cf注册的。
### 安装`cloudflare-tunnel-ingress-controller`

IP和端口是不方便记忆的，我们可以利用[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)将服务用域名的方式暴露出去，顺便全自动添加TLS证书，实现HTTPS访问。这里有大佬提供了一个可以用于管理[cloudflared](https://github.com/cloudflare/cloudflared)的[ingress controller](https://github.com/STRRL/cloudflare-tunnel-ingress-controller)，非常方便。

由于需要使用[Helm](https://helm.sh)，我们需要先安装下Helm。
```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```
安装完成后，我们检查下是否安装成功：
```bash
$ helm version
version.BuildInfo{Version:"v3.15.2", GitCommit:"1a500d5625419a524fdae4b33de351cc4f58ec35", GitTreeState:"clean", GoVersion:"go1.22.4"}
```
能正常打印版本即为安装成功。

下面我们先添加Helm仓库：
```bash
helm repo add strrl.dev https://helm.strrl.dev
helm repo update
```

然后安装`cloudflare-tunnel-ingress-controller`：
```bash
helm upgrade --install --wait \
  -n cloudflare-tunnel-ingress-controller --create-namespace \
  cloudflare-tunnel-ingress-controller \
  strrl.dev/cloudflare-tunnel-ingress-controller \
  --set cloudflare.apiToken="<cloudflare-api-token>" \
  --set cloudflare.accountId="<cloudflare-account-id>" \
  --set cloudflare.tunnelName="<your-favorite-tunnel-name>" 
```

其中有三个占位符，需要填写自己的账号或令牌相关信息：

`<cloudflare-api-token>`是Cloudflare API token，需要自己创建，包含以下三个权限：
- Zone:Zone:Read
- Zone:DNS:Edit
- Account:Cloudflare Tunnel:Edit
`<cloudflare-account-id>`是你的账户ID，跟你的域名挂钩。[官方获取指南](https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/)
`<your-favorite-tunnel-name>`是隧道名称，可以填个你自己喜欢且容易辨认的。

安装完成后，你应该可以看到相关的Pod：
![[Pasted image 20240701210713.png]]

### 配置Ingress

接下来，我们只需要创建`ingressClassName`为`cloudflare-tunnel`的Ingress，流量就会自动交给上面的`cloudflare-tunnel-ingress-controller`来管理。

所以哪怕后面你有更多服务需要借由Cloudflare Tunnel来公开，也不用再次安装`cloudflare-tunnel-ingress-controller`，只需要新建对应的Ingress即可。

创建`cloudflare-ingress.yaml`文件：
```yaml
kind: Ingress
apiVersion: networking.k8s.io/v1
metadata:
  name: dashboard-via-cf-tunnel
  namespace: kubesphere-system
  finalizers:
    - strrl.dev/cloudflare-tunnel-ingress-controller-controlled
spec:
  ingressClassName: cloudflare-tunnel
  rules:
    - host: example.com # 你要公开的域名
      http:
        paths:
          - path: /*
            pathType: Prefix
            backend:
              service:
                name: ks-console # 指定的 Service 名称
                port:
                  number: 80 # 指定的端口
```
然后apply一下即可：
```bash
kubectl apply -f cloudflare-ingress.yaml
```

如果你懒得创建冗长的文件，也可以用一行命令搞定：
```bash
kubectl -n kubesphere-system \
  create ingress dashboard-via-cf-tunnel \
  --rule="example.com/*=ks-console:80"\
  --class cloudflare-tunnel
```

然后我们就可以在 Cloudflare 的控制台看到对应的隧道里面多了一条 `Public Hostname` 数据，说明已经成功了，现在可以直接通过域名访问了。

