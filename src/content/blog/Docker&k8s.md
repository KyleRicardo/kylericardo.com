---
title: Docker and K8s
date: 2024-03-09 14:40:27
categories:
- [玩转系列, DevOps]
tags:
- DevOps
- k8s
---

这篇文章将记录如何从零开始安装一整套 Docker 和 K8s。网上的资料大多很杂，故自己整理一份，供自己和大家参考。

## Prerequisition

```bash
$ sudo apt update
$ sudo apt install -y curl net-tools
```



## Install Docker

> Official docs: [Ubuntu](https://docs.docker.com/engine/install/ubuntu/) [Debian](https://docs.docker.com/engine/install/debian/) [CentOS](https://docs.docker.com/engine/install/centos/) [Fedora](https://docs.docker.com/engine/install/fedora/)

### Use the convenience script (recommended for dev)

```bash
$ curl -fsSL https://get.docker.com | sudo bash
```

### Use apt repository for docker (recommended for prod)

1. Set up Docker's `apt` repository.

```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

2. Install the Docker packages.

```bash
$ sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```



## Make docker rootless

> Reference: [RootlessContainer](https://rootlesscontaine.rs/getting-started/docker/) [Minikube Driver](https://minikube.sigs.k8s.io/docs/drivers/docker/)

```bash
sudo apt install -y uidmap
dockerd-rootless-setuptool.sh install
docker context use rootless
```



## Install minikube

> Reference: [Official doc](https://minikube.sigs.k8s.io/docs/start/)

### Installation

```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

### CPU delegate

```bash
$ sudo mkdir -p /etc/systemd/system/user@.service.d
$ cat <<EOF | sudo tee /etc/systemd/system/user@.service.d/delegate.conf
[Service]
Delegate=cpu cpuset io memory pids
EOF
$ sudo systemctl daemon-reload
```

### Start your cluster

```bash
$ minikube start --driver=docker --container-runtime=containerd
```

Caveats: the command is `minikube` not `minicube`，though the pronunciations are the same. If you type `minicube`, bash won't find anything in the PATH.

### Install kubectl

> [Offcial doc](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/)

```bash
$ curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
$ sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

