---
title: 玩坏系列之FPS游戏透视原理及其实现（PART I）
date: 2019-04-12 00:13:57
categories: 
- [玩坏系列, 游戏修改]
tags:
- FPS
- ESP
- 透视
- 线性代数
- 矩阵论
- D3D绘制
mathjax: true

---

最近对FPS游戏外挂中的主要功能之一——透视——非常感兴趣，经过了几天时间的研究，终于大致摸清了其原理和其实现的技术手段，通过百度和谷歌发现国内有关这方面的文献非常少，于是撰写此文，详细剖析一下透视原理，也起到一个抛砖引玉的作用。

<!-- more -->

## 前言

透视可以说是FPS外挂中最基础、最核心的一项功能了。老外习惯称之为ESP（Extra Sensual Perception），也就是说类似于心电感应、透视能力、预知能力等超能力的总称。所以如果以后看到国外论坛提到ESP，应该将其理解为“透视”。我们知道，FPS里的视觉遮挡和MOBA游戏里的战争迷雾有着异曲同工之妙，能为下一秒创造无限的惊喜。所以，如果你能破除这一限制，透过这些遮挡看到敌方单位所在，在游戏里会是非常无敌的存在。这对应着FPS（当然，不一定是FPS，也有可能是TPS）里的透视和MOBA里的开全图。这一功能对游戏平衡性的影响是非常巨大的。

从另一方面来说，就算开了透视，也拯救不了手残，狭路相逢，你仍有可能被枪法精湛的玩家满血打死。所以外挂经常会有另外一个功能，没错，就是自瞄（一般是锁头），老外一般称之为Aimbot，意为瞄准机器人。透视+自瞄这两个功能互相配合，相辅相成，能在FPS中成为能力不俗的“神仙”。

本文就来研究一下外挂实现透视的理论基石，并介绍几种理论上实现该功能的技术手段。至于自瞄，那就是以后的事情了。

## PART I  基本数学理论储备

为了简便起见，本文不涉及太过高深的数学理论，但是，基础的线性代数和矩阵知识还是有必要掌握。

### 坐标与坐标系

我们平常所说的坐标及坐标系，主要是指笛卡尔坐标和笛卡尔坐标系（Cartesian Coordinates）。所谓笛卡尔坐标系，就是直角坐标系和斜坐标系的统称。相交于原点的两条数轴，构成了平面放射坐标系。如两条数轴上的度量单位相等，则称此放射坐标系为笛卡尔坐标系。两条数轴互相垂直的笛卡尔坐标系，称为笛卡尔直角坐标系，否则称为笛卡尔斜角坐标系。这个是二维的情况，三维则是放射坐标系和笛卡尔坐标系平面向空间的推广：相交于原点的三条不共面的数轴构成空间的放射坐标系。三条数轴上度量单位相等的放射坐标系被称为空间笛卡尔坐标系。三条数轴互相垂直的笛卡尔坐标系被称为空间笛卡尔直角坐标系，否则被称为空间笛卡尔斜角坐标系。

相应的，我们还会需要齐次坐标以及齐次坐标系（Homogeneous Coordinates）。所谓齐次坐标，就是将一个原本是n维的向量用一个n+1维向量来表示，是一个用于投影几何里的坐标，如同用于欧式几何里的笛卡尔坐标一般。齐次坐标表示是计算机图形学的重要手段之一，它既能够用来明确区分向量和点，同时也更易用于进行仿射（线性）几何变换。齐次坐标在电脑图形内无处不在，因为该坐标允许平移、旋转、缩放及透视投影等可表示为矩阵与向量相乘的一般向量运算。依据链式法则，任何此类运算的序列均可相乘为单一个矩阵，从而实现简单且有效之处理。与此相反，若使用笛卡尔坐标，平移及透视投影不能表示成矩阵相乘，虽然其他的运算可以。现在的OpenGL及Direct3D图形卡均利用齐次坐标的优点，以具4个暂存器的向量处理器来用作顶点着色引擎。

齐次坐标也称为投影坐标（Projective Coordinates）。

#### 手性与右手坐标系

手性一词指一个物体不能与其镜像相重合。如我们的双手，左手与互为镜像的右手不重合。

三维坐标系中，如果我们已经确定了X轴和Y轴的方向，那么Z轴作为垂直于XOY平面的轴，其方向并不能确定，因为存在“手性”。伸出我们的手，将大拇指与X轴方向对齐，食指与Y轴方向对齐，弯曲中指使得中指垂直于手掌，此时中指的方向即为Z轴的方向，我们会发现使用左手来确定的Z轴方向和使用右手来确定的Z轴方向是正好相反的。我们将使用右手来确定Z轴方向的坐标系称为右手坐标系，否则称为左手坐标系。

### 向量与向量空间

在刚刚的讨论中，我们不知不觉提到了向量这个数学名词，因为它和坐标的关系实在是太密切了。向量的英文是Vector，有时候也被称为矢量。与标量Scalar只有大小没有方向这一特点相对应，向量是具有大小和方向的量。它可以形象化地表示为带箭头的线段。箭头所指代表向量的方向，线段长度代表向量的大小。向量与坐标的关系是，向量可以被一组坐标来表示。我们知道，向量只表示大小和方向，所以它的位置是没有意义的，也就是说，无论我们怎样平移一个向量，它都不会改变，正因为如此，它的起点始终被定义为坐标系的原点，然后可以用它的终点P的坐标来表示这个向量。

向量空间也称为线性空间，是由给定数量的线性无关向量（也称为基向量）定义的数学结构。基向量的个数定义了向量空间的大小（维度），因此3D空间有3个基向量，2D空间则为2个。该空间中所有的其他向量都可以被基向量作缩放和加减运算来得到。本文并不打算在这一块进行展开，我们只用了解在游戏世界中的所有对象都存在于特定的向量空间内。

### 矩阵与变换

限于篇幅，矩阵的定义在这里就不细说了。矩阵乘法的计算法则，也请自行了解。这里着重讨论一下向量空间的变换与矩阵的关系，看看矩阵在其中扮演了怎样的角色。

什么是变换？变换是将一个向量空间映射到另一个向量空间的过程。在线性代数中，线性变换能用矩阵表示，而用矩阵来表示线性变换的一个主要动力就是可以很容易地进行组合变化以及逆变换。线性变换并不是唯一可以用矩阵表示的变换。R维的仿射变换与透视投影都可以用齐次坐标表示为RP维（即n+1维的真实投影空间）的线性变换。因此，在三维计算机图形学中大量使用着4×4的矩阵变换。常见的三种变换分别为平移、缩放和旋转。这三种变换都有逆变换，也就是说变换是可逆的。要注意，正投影变换因为直接损失了一个维度的信息，所以它是一种不可逆的变换。

我们先看一下如何用矩阵形式表示一个泛型变换（即通用变换）：
$$
\begin{bmatrix}
		Transform\_XAxis.x & Transform\_YAxis.x & Transform\_ZAxis.x & Translation.x\\
		Transform\_XAxis.y & Transform\_YAxis.y & Transform\_ZAxis.y & Translation.y\\
		Transform\_XAxis.z & Transform\_YAxis.z & Transform\_ZAxis.z & Translation.z\\
		0 & 0 & 0 & 1
	\end{bmatrix}
$$
我们可以这样去理解这样一个矩阵：

Transform_XAxis表示新空间的X轴在原空间中的方向向量，所以Transform_XAxis.x表示新空间的X轴在原空间中的X轴方向的分量，Transform_XAxis.y表示Y轴分量，Transform_XAxis.z表示Z轴分量。同理，Transform_YAxis表示新空间的Y轴在原空间中的方向向量，Transform_YAxis表示新空间的Y轴在原空间中的方向向量。

Translation则描述了新空间相对于原空间的位置，我们也可以理解成新空间的原点在原空间的坐标。

有时候我们想做一些简单的变换，比如平移和旋转；在这些情况下我们可以使用以下矩阵，这些矩阵是我们刚刚提出的通用形式的特殊情况。

平移矩阵：
$$
	\begin{bmatrix}
		1 & 0 & 0 & Translation.x\\
		0 & 1 & 0 & Translation.y\\
		0 & 0 & 1 & Translation.z\\
		0 & 0 & 0 & 1
	\end{bmatrix}
$$
其中Translation是一个表示我们想要我们的空间移动到的位置的三维向量。平移矩阵的旋转矩阵是单位阵，为的是使每个轴都不发生旋转。

缩放矩阵：
$$
	\begin{bmatrix}
		Scale.x & 0 & 0 & 0\\
		0 & Scale.y & 0 & 0\\
		0 & 0 & Scale.z & 0\\
		0 & 0 & 0 & 1
	\end{bmatrix}
$$
其中Scale是一个表示沿每个轴进行缩放的三维向量。如果你仔细看第一列你会发现新的X轴还是指向相同的方向但它被标量Scale.x缩放了。所有其他的轴也发生了这些变化。注意到平移列全是0，这意味着不需要平移。

绕X轴旋转的旋转矩阵：
$$
	\begin{bmatrix}
		1 & 0 & 0 & 0\\
		0 & \cos\theta & -\sin\theta & 0\\
		0 & \sin\theta & \cos\theta & 0\\
		0 & 0 & 0 & 1
	\end{bmatrix}
$$
$\theta$是我们想要用于旋转的角度。注意第一列永远不会改变，这是可以预料到的，因为我们是绕X轴旋转。另请注意如果$\theta$变为90°，则Y轴将重新映射到Z轴，Z轴将重新映射到-Y轴。

绕Y轴旋转的旋转矩阵：
$$
	\begin{bmatrix}
		\cos\theta & 0 & \sin\theta & 0\\
		0 & 1 & 0 & 0\\
		-\sin\theta & 0 & \cos\theta & 0\\
		0 & 0 & 0 & 1
	\end{bmatrix}
$$
绕Z轴旋转的旋转矩阵：
$$
	\begin{bmatrix}
		\cos\theta & -\sin\theta & 0 & 0\\
		\sin\theta & \cos\theta & 0 & 0\\
		0 & 0 & 1 & 0\\
		0 & 0 & 0 & 1
	\end{bmatrix}
$$
Z轴和Y轴的旋转矩阵的行为与X轴旋转矩阵的行为方式相同。

我刚才提到的矩阵是最常用的矩阵，它们是描述刚性变换所需要的全部矩阵。你可以通过将矩阵一个接一个地相乘来将多个变换链接在一起。结果将是能描述完整变换的单个矩阵。正如我们在变换部分所看到的，我们应用变换的顺序非常重要。这在数学中反映为矩阵乘法是不可交换的。因此通常来讲先平移后旋转和先旋转后平移是不一样的。

如果我们使用列向量，我们必须从右到左读取一个变换链，所以我们如果想绕Y轴向左旋转90°，然后沿X轴平移10个单位，那么变换链将是[沿X轴平移10个单位] × [绕Y轴旋转90°] = [复合变换矩阵]。

### 模型空间/局部空间/物体空间

对应的英文单词分别是Model Space，Local Space和Object Space。当游戏模型设计师创作一个模型时，不管是人物还是景观，都是构建在各自的模型空间中的。每个物体都有其自己的原点和XYZ三维坐标系，物体的每一个顶点都在各自的模型空间中有自己的坐标，从而与其他物体无关。这样能保证一个物体的独立性和完整性，也便于游戏引擎管理每个对象。而局部空间是相对于全局空间而言的，在游戏引擎中，全局空间即为我们马上要提到的世界空间，一个游戏世界的每个模型都存在与该空间中，共享它的原点和XYZ坐标轴。

### 世界空间/全局空间

对应的英文单词分别是World Space和Global Space。在游戏世界中，我们需要一个空间来放置所有物体，于是我们有了世界空间这个概念。而全局空间则是相对于局部空间来说的。有一个参考是好事，但并不总是跟踪事物在空间中的最佳方式。例如，你正在寻找街道上的房子，如果你知道了该房子的经纬度，就可以随时使用GPS进行定位。但是，如果你已经在房子所在的街道上，使用其门牌号来找到这个房子比使用GPS更简单快捷。门牌号码不过是相对于某个参考系定义的坐标，而这个参考系就是街道上第一间房子。在这个栗子中，整个街道可以看做局部坐标系，而经纬度衡量的是全局坐标系。当你将自己置身于定义这些事物的参考系中时，用局部坐标系来寻找某个事物非常有用。注意，局部坐标系本身可以相对于全局坐标系定义（例如，我们可以根据经纬度坐标定义其原点）。

计算机图形学中的情况大抵相似。我们总是可以知道事物相对于世界坐标系来说在什么位置，但为了简化计算，我们可以很方便地定义事物在局部坐标系的位置。这也是局部坐标系的意义所在。

我们已经知道，对一个3D的物体进行变换操作可以被我们称之为一个4×4的变换矩阵表示（只不过是一个4×4的矩阵罢了，但是由于它被用来平移、缩放和旋转一个空间中的物体，我们将它称之为变换矩阵）。这个矩阵就可以看作是一个局部坐标系。从某种意义上来说，你不用真正去变换一个物体，而是变换该物体所在的局部坐标系就可以了了，这是由于组成该物体的所有顶点都是相对于局部坐标系来定义的，所以我们变换了这个局部坐标系，就相当于变换了该坐标系中所有的顶点。

### 观察空间/视觉空间/相机空间

对应的英文单词分别是View Space和Camera Space。这个空间有如此多的叫法，但其实就是FPS游戏中角色的眼睛所能看到的空间。与现实世界一样，我们拍照的时候，需要移动并旋转相机以调整视点。所以在某种程度上，当你通过平移和旋转来改变相机的时候（请注意，缩放一个相机并没有什么意义），你事实上做的事情就是变换一个局部坐标系来隐式表示用于该相机的变换。

所以相机空间不过也就是一个坐标系罢了，我们将物体从模型空间变换到世界空间所用的技术，也能应用在从世界空间变换到相机空间上。

为什么我们需要一个相机空间呢？我们可以把屏幕想象为一个画布，游戏世界中所有的物体都需要最终投影到画布上，而相机空间起到了一个辅助的作用。当所有的物体的坐标都变换到相机空间的时候，我们只需要做一些投影变换（再加上一点点其他的计算）就能得到世界空间的一个顶点在屏幕上的位置。它起到了过渡的作用。

有一点需要格外注意，摄像机所指向的方向永远是相机空间的Z轴负方向。我们在以后的计算中会发现z坐标经常带有负号，就是这个原因。

到目前为止，从一个空间到另一个空间的变换操作并不复杂，也很好理解，但是下面的投影变换就比较棘手了，我们会花较大的篇幅讲解这一块位置。

### 投影空间

这一部分相当棘手，我们会对正投影变换矩阵和透视投影矩阵的推导过程做详细的阐述。

#### 正投影矩阵及其推导

正投影的理解相对简单一点，也是理解透视投影矩阵的前提。事实上，正投影在如今大多数场合都没有太大意义，因为它并不符合我们眼中所见的“近大远小”的规则。但是某些游戏仍然使用了正投影，因为在这些游戏中正投影比透视投影产生的更自然的外观更好，比如模拟人生和模拟城市等。

我们来看看如何创建一个矩阵，将相机空间中的一个点投影到正交相机平面上的一个点。

该正交投影矩阵的目的是将3D空间中某个立方体内所包含的所有坐标重新映射到规范化的正方体中。如下图所示。所以，投影点的XYZ坐标从投影前的任何值重新映射到范围[-1, 1]。

让我们看看如何实现这种映射。

我们假设屏幕坐标的l,r,t,b分别表示左右上下。x坐标目前的范围是[l, r]，我们要将其映射到[-1, 1]，一步步来：

我们可以将x的范围写作：
$$
l \le x \le r
$$
不等式每部分同时减去l，得到：
$$
0 \le x-l \le r-l
$$
我们想要不等式右边变成1，于是做除法：
$$
0 \le \frac{x-l}{r-l} \le 1
$$
两边同时乘以2再减1：
$$
-1 \le 2\frac{x-l}{r-l}-1 \le 1
$$
可以看到不等式中间的项已经是处在[-1, 1]之间了。我们做一些变换，将x变量分离出来：
$$
-1 \le { 2 \dfrac{x - l}{r - l} -  \dfrac{r-l}{r-l}} \le 1
$$

$$
-1 \le \dfrac{2x - 2l - r + l}{r - l} \le 1
$$

$$
-1 \le \dfrac{2x - l - r}{r - l} \le 1
$$

$$
-1 \le \dfrac{2x}{r - l} -  \dfrac{r + l}{r - l} \le 1
$$

中间项已经将x变量分离，形成了关于x的一元一次表达式。这就是用于变换x的公式：
$$
x'= \dfrac{2x}{r - l} - \dfrac{r + l}{r - l}
$$
这个公式可以表示为矩阵形式：
$$
\begin{bmatrix}
\dfrac{2}{r - l} & 0 & 0 & 0 \\
0 & 1 & 0 & 0 \\
0 & 0 & 1 & 0\\ -\dfrac{r + l}{r - l} & 0 & 0 & 1
\end{bmatrix}
$$
对y坐标的处理方式是完全一样的，你只需要把r和l分别替换为t和b就行了。现在矩阵变为：
$$
\begin{bmatrix}
\dfrac{2}{r - l} & 0 & 0 & 0 \\
0 & \dfrac{2}{t - b}  & 0 & 0 \\
0 & 0 & 1 & 0\\ -\dfrac{r + l}{r - l} & -\dfrac{t + b}{t - b} & 0 & 1
\end{bmatrix}
$$
为了完整地得到我们的正投影矩阵，我们还需要重新映射z坐标。

我们从以下条件开始（其中n代表near，近端界限的坐标；f代表far，远端界限的坐标）：
$$
n \le -z \le f
$$
别忘了我们用的是右手坐标系，摄像机所能看到的所有点的z坐标都是负数，所以我们要用-z而不是z。同样地，我们进行如下移项操作：
$$
0 \le -z-n \le f-n
$$
进行与上面相似的操作后，我们能得到左右两端分别为-1和1的不等式：
$$
-1 \le 2 \dfrac{-z-n}{f-n} -1 \le 1
$$
对变量x进行分离：
$$
-1 \le \dfrac{-2z}{f-n} - \dfrac{f+n}{f-n} \le 1
$$
所以用于变换z的公式为：
$$
z' = \dfrac{-2z}{f-n} - \dfrac{f+n}{f-n}
$$
加入这两项到矩阵中：
$$
\begin{bmatrix}
\dfrac{2}{r - l} & 0 & 0 & 0 \\
0 & \dfrac{2}{t - b} & 0 & 0 \\
0 & 0 & {\color{\red}{ \dfrac{-2}{f-n}}} & 0\\ -\dfrac{r + l}{r - l} & -\dfrac{t + b}{t - b} & {\color{\red}{ -\dfrac{f + n}{f-n}}} & 1
\end{bmatrix}
$$
别忘了OpenGL中使用的是列优先矩阵。所以我们转置一下就能得到OpenGL教材中我们能看到的矩阵：
$$
\begin{bmatrix}
\dfrac{2}{r - l} & 0 & 0 & -\dfrac{r + l}{r - l} \\
0 & \dfrac{2}{t - b} & 0 &  -\dfrac{t + b}{t - b} \\
0 & 0 & {\color{\red}{\dfrac{-2}{f-n}}} & {\color{\red}{-\dfrac{f+n}{f-n}}}\\ 
0 &0 & 0 & 1
\end{bmatrix}
$$
如果说r-l可以看作屏幕的宽，t-b可以看作屏幕的高，我们可以改写上面的矩阵为：
$$
\begin{bmatrix}
\dfrac{2}{width} & 0 & 0 & 0 \\
0 & \dfrac{2}{height} & 0 &  0 \\
0 & 0 & {\color{\red}{\dfrac{-2}{Z_{far}-Z_{near}}}} & {\color{\red}{-\dfrac{Z_{far}+Z_{near}}{Z_{far}-Z_{near}}}}\\ 
0 &0 & 0 & 1
\end{bmatrix}
$$
如此，我们已经得到了正投影的变换矩阵。

### 透视投影矩阵及其推导

最棘手的部分来了，该部分将占用大量篇幅。

#### 齐次坐标

我们首先了解一下齐次坐标。我们可以这样理解，齐次坐标（x, y, z, w）与笛卡尔坐标（x/w, y/w, z/w）等价。所以我们发现经常将w设定为1，就是因为齐次坐标（x, y, z, 1）与笛卡尔坐标（x, y, z）等价。所以三维坐标变为齐次坐标最简单的办法就是增加一个维度w并将其设定为1。齐次坐标中，将每个维度的值都缩放同样的倍数，不会对坐标所表示的点产生影响，因为它们代表同一个笛卡尔坐标。

#### 透视除法

我们再来看看透视除法。忽略其他干扰因素，我们看个最简单的例子。

![image](https://ws3.sinaimg.cn/large/8832d37agy1fzmqj7qqp4j20b405j749.jpg)

在上图中，你很容易发现绿色三角形（$\Delta ABC$）和红色三角形（$\Delta DEF$）相似。根据相似三角形的特性，易知：
$$
\dfrac{BC} {EF} = \dfrac{AB} {DE}
$$
我们感兴趣的是BC的长度，所以我们可以把上式写作：
$$
BC = \dfrac{AB \times EF} {DE}
$$
我们假设AB的长度为1个单位，则我们可以得到计算BC的最终公式：
$$
BC = \dfrac{(AB=1) \times EF} {DE} = \dfrac{EF} {DE}
$$
从这个方程我们可以知道，要得到P'点的x和y坐标，我们只要把P点的x和y坐标分别除以P点的z坐标就行了。用数学形式可以表示为：
$$
\begin{array}{l}
P'_x=\dfrac{P_x}{-P_z}\\
P'_y=\dfrac{P_y}{-P_z}
\end{array}
$$
注意我们之所以除以-z而不是z，是因为相机的可视区域的z坐标永远都是负数，在这里的除法我们需要一个正数。

#### 原理

通过上面的知识点讲解，我们清楚了投影点P'坐标的计算方法。我们先将x'，y'和z'分别设置值为x，y，-z，即：
$$
\begin{array}{l}
x' = x\\
y' = y\\
z' = -z \:\:\: z' > 0\\
\end{array}
$$
如果我们在某个点与矩阵的乘法过程中，能把x'，y'，z'分别除以-z，则我们可以得到：
$$
\begin{array}{l}
x' = \dfrac {x}{-z}\\
y' = \dfrac {y}{-z}\\
z' = \dfrac {-z}{-z} = 1\\
\end{array}
$$
这正是计算投影点P'坐标的方程式（暂时不用考虑z'的问题）。那么问题来了，能否有可能通过点乘以矩阵来获得这个结果？如果可以，那个矩阵是什么样子的？其实很简单，我们回到上面的齐次坐标知识点。坐标（x', y', z'）即$\left(\frac{x}{-z}, \frac{y}{-z}, \frac{-z}{-z}\right)​$$相当于齐次坐标​$$\left(\frac{x}{-z}, \frac{y}{-z}, \frac{-z}{-z}, 1\right)​$也即$\left(\frac{x}{-z}, \frac{y}{-z}, \frac{-z}{-z}, \frac{-z}{-z}\right)​$。我们将其四个维度均放大-z倍，可以得到齐次坐标（x, y, -z, -z）。这样的话我们的计算法则为：
$$
\begin{array}{l}
x' = x * 1 + y * 0 + z * 0 + w * 0 &=&x\\
y' = x * 0 + y * 1 + z * 0 + w * 0 &=&y\\
z' = x * 0 + y * 0 + z * -1 + w * 0 &=&-z\\
w' = x * 0 + y * 0 + z * -1 + (w=1) * 0 &=&-z\\
\end{array}
$$
我们要的矩阵已经呼之欲出了：
$$
\begin{bmatrix}
1 & 0 & 0 & 0\\ 
0 & 1 & 0 & 0\\
0 & 0 & -1 & \color{red}{-1}\\
0 & 0 & 0 & 0
\end{bmatrix}
$$
我们在之前的透视除法的讲解中，把近端的截面离相机的距离简单地设置为了1个单位，然而现在我们要将它换为真实的距离$n$表示near。同样地，在下图中，三角形$\Delta ABC$与$\Delta DEF$相似。则有：

![image](https://wx3.sinaimg.cn/large/8832d37agy1fzmqkc4bz8j20er07y0t6.jpg)
$$
{\dfrac{AB}{DE}} = {\dfrac{BC}{EF}}
$$
如果我们用$n​$代替AB，$P_z​$代替DE，$P_y​$代替EF，我们可以把等式改写为：
$$
{\dfrac{n}{-P_z}} = {\dfrac{BC}{P_y}} \rightarrow BC = Ps_y = {\dfrac{n \cdot P_y}{-P_z}}.
$$
如你所见，这个与上面讲的透视除法中，除了分子多了个$n​$以外，其他没有什么变化，除以$P_z​$的规则还是没变。

同样地，我们可以得到：
$$
Ps_x =\dfrac{n \cdot P_x}{-P_z}
$$

#### 推导

![image](https://ws3.sinaimg.cn/large/8832d37agy1fzmqmhk56yj208c0643z6.jpg)

现在我们知道了计算$Ps_x$和$Ps_y$的方法，但我们还得将它们通OpenGL的透视矩阵联系起来。透视矩阵的目标是将投影到图像平面上的值重新映射到单位立方体（最小和最大范围分别为$(-1, -1, -1)$和$(1, 1, 1)$的立方体）。然而，一旦点P投影在图像平面上，只有Ps的x和y坐标分别位于范围[left, right]和[bottom, top]内时才是可见的。这些屏幕坐标定义了图像平面的可视点的界限或边界。假设$Ps_x$是可见的，则有：
$$
l \leq Ps_x \leq r
$$
其中 $l​$ 和 $r​$ 分别表示left和right。我们的目标是将左右边界映射到-1和1，则我们先移项：
$$
0 \leq Ps_x - l \leq r - l
$$
不等式同时除以 $r-l$ 然后乘以2再减1：
$$
-1 \leq 2{\dfrac{Ps_x - l}{r-l}} -1 \leq 1
$$
这时我们已经让中间项的值处于[-1, 1]范围了，但我们需需要将$Ps_x​$分离出来：
$$
-1 \leq 2{ \dfrac{Ps_x - l}{r-l} } - { \dfrac{r-l}{r-l} } \leq 1
$$
我们有
$$
-1 \leq { \dfrac{2Ps_x - 2l - r + l}{r-l} } \leq 1
$$
最终得到：
$$
-1 \leq { \dfrac{2Ps_x - l - r}{r-l} } \leq 1 \rightarrow  -1 \leq { \dfrac{2Ps_x}{r-l} } - { \dfrac{r + l}{r - l} } \leq 1
$$
我们很容易得到我们的矩阵：
$$
\left[\begin{array}{cccc}
{ \dfrac{2n}{ r-l } } & 0 & { \dfrac{r + l}{ r-l } } & 0 \\
... & ... & ... & ... \\
... & ... & ... & ... \\
0 & 0 & -1& 0\\
\end{array}\right]
$$
记得OpenGL的矩阵是列优先的，所以我们的矩阵要左乘列向量：
$$
\begin{bmatrix}
{ \dfrac{2n}{ r-l } } & 0 & { \dfrac{r + l}{ r-l } } & 0 \\
... & ... & ... & ... \\
... & ... & ... & ... \\
0 & 0 & -1& 0\\
\end{bmatrix}  \begin{bmatrix}x \\ y \\ z \\ w\end{bmatrix}
$$
可以计算出$Ps_x$：
$$
Ps_x = { \dfrac{2n}{ r-l } } P_x + 0 \cdot P_y + { \dfrac{r + l}{ r-l } } \cdot P_z + 0 \cdot P_w
$$
由于透视除法的存在，我们需要除以$-P_z$来从齐次坐标转换到笛卡尔坐标：
$$
Ps_x = \dfrac { \dfrac {2n} { r-l } P_x } { -P_z} + \dfrac{ \dfrac {r + l} { r-l } P_z } { -P_z} \rightarrow \dfrac {2n P_x} { -P_z (r-l) } - \dfrac {r + l} { r-l }
$$
这正是我们上面不等式的中间项。同理，我们可以得到关于$Ps_y$的不等式：
$$
-1 \leq { \dfrac{2 n P_y}{-P_z{(t-b)}} } - { \dfrac{t + b}{t - b} } \leq 1
$$
完善我们的矩阵：
$$
\begin{bmatrix}
{ \dfrac{2n}{ r-l } } & 0 & { \dfrac{r + l}{ r-l } } & 0 \\
0 & { \dfrac{2n}{ t-b } } & { \dfrac{t + b}{ t-b } } & 0 \\
... & ... & ... & ... \\
0 & 0 & -1& 0\\
\end{bmatrix}
$$
用矩阵来计算$Ps_y$：
$$
Ps_y = 0 \cdot P_x + { \dfrac{2n}{ (t-b) } } \cdot P_y + { \dfrac{t + b}{ t-b } } \cdot P_z + 0 \cdot P_w
$$
作透视除法后：
$$
Ps_y = \dfrac { \dfrac {2n} {t - b} P_y } { -P_z} + \dfrac{ \dfrac {t + b} {t - b}  P_z } { -P_z} = \dfrac {2n P_y} { -P_z (t - b) } - \dfrac {t + b} {t - b}
$$
与上面的不等式丝毫不差。现在我们要做的只剩将z坐标重新映射到[-1, 1]了。我们很清楚上面的规则并不适用于对z坐标的操作，我们得重新思考下。

纵然我们不清楚矩阵第三行的4个值，但由于$Ps_z$只与$P_z$和$P_w$有关，我们可以知道前两列的值为0（绿色表示），然后我们可以将后两列的未知值设为A和B（红色表示）。
$$
\begin{bmatrix}
{ \dfrac{2n}{ r-l } } & 0 & { \dfrac{r + l}{ r-l } } & 0 \\
0 & { \dfrac{2n}{ t-b } } & { \dfrac{t + b}{ t-b } } & 0 \\
{ \color{\green}{ 0 } } & { \color{\green}{ 0 } } &  { \color{\red}{ A } } &{ \color{\red}{ B } }\\
0 & 0 & -1 & 0 \\
\end{bmatrix}
$$
如果我们将该矩阵用于计算$Ps_z$，我们得到（别忘了同样要除以$Ps_w$来完成透视除法）：
$$
Ps_z = \dfrac{0 \cdot P_x + 0 \cdot P_y + A \cdot P_z + B \cdot P_w}{Ps_w = -P_z} = \dfrac{A P_z + B}{Ps_w = -P_z}
$$
我们需要解出A和B的值。所幸的是我们知道当$P_z$位于近端截面时，$Ps_z$需要被重新映射为-1；当$P_z$位于远端截面时，$Ps_z$需要被重新映射为1。所以我们需要把$Ps_z$替换为 $n$ 和 $f$ 来得到两个方程。注意 $n$ 和 $f$ 都是正数，而$-P_z$也是正数。
$$
\left\{ \begin{array}{ll} \dfrac{(P_z=-n)A + B}{(-P_z=-(-n)=n)} = -1 &\text{ when } P_z = n\\ \dfrac{(P_z=-f)A + B}{(P_z=-(-f)=f)} = 1 & \text{ when } P_z = f \end{array} \right. \\ \rightarrow  \left\{ \begin{array}{ll} {-nA + B} = -n & (1)\\  {-fA + B} = f & (2) \end{array} \right.
$$
解方程组，得：
$$
\left\{ \begin{array}{ll} A = -\dfrac{f + n}{f - n}\\  B = -\dfrac{2fn}{f - n} \end{array} \right.
$$
替换矩阵中的未知值，我们总算得到了完整的矩阵：
$$
\begin{bmatrix} { \dfrac{2n}{ r-l } } & 0 & { \dfrac{r + l}{ r-l } } & 0 \\ 0 & { \dfrac{2n}{ t-b } } & { \dfrac{t + b}{ t-b } } & 0 \\ 0 & 0 & -{\dfrac{f+n}{f-n}} & -{\dfrac{2fn}{f-n}}\\ 0 & 0 & -1& 0\\ \end{bmatrix}
$$

#### 视场角（FOV）

也许你注意到我们这么长时间还没讨论过耳熟能详的FOV，急啥，这不来了么。

所谓的FOV就是Field of View，也就是我们眼睛所能观察到的角度。

![image](https://ws2.sinaimg.cn/large/8832d37agy1fzmqnfrd51j208c08taa6.jpg)

看图，我们很容易有：
$$
\tan\left( \dfrac{ FOV_Y } {2}\right) = \dfrac{ opposite } { adjacent } = \dfrac {BC}{AB} = \dfrac{top}{near}
$$
因此，
$$
top = \tan\left( \dfrac{ FOV_Y } {2}\right) \cdot near
$$
且因为下半部的长度与上半部相等，我们可以这样写：
$$
bottom = -top
$$
同理，我们还可以有如下等式：
$$
right = \tan\left( \dfrac{ FOV_X } {2}\right) \cdot near \\
left = -right
$$
将上面这4个等式代入我们的矩阵中，可以得到以FOV表示的矩阵：
$$
\begin{bmatrix}
		\tan^{-1}\left(\frac{FOV_X}{2}\right) & 0 & 0 & 0\\
		0 & \tan^{-1}\left(\frac{FOV_Y}{2}\right) & 0 & 0\\
		0 & 0 & -\frac{f+n}{f-n} & -\frac{2f \cdot n}{f-n}\\
		0 & 0 & -1 & 0
	\end{bmatrix}
$$
那么，冗长而精彩的投影空间部分就介绍到这里了。

### 屏幕空间

英文单词为Screen Space。我们知道，游戏世界内的所有物体最终是要展现在电脑屏幕上，所以我们还少不了最后一步：屏幕空间。到了这一步就已经很轻松了，我们已经知道了投影在屏幕上的点在[-1, 1]上的范围，只要按比例乘以屏幕的高宽然后加上去就完事了。请注意，在透视变换完成后，z坐标已经没有什么意义，因为屏幕是二维的。还有一点要弄清楚，光栅坐标系的原点为屏幕的左上角，向右为X轴正方向，向下为Y轴正方向，如图所示。而我们的投影坐标系的原点在正中间，向右为X轴正方向，向上为Y轴正方向，所以在转换光栅坐标的时候要注意符号的变化。我们会在下面即将说明的计算机图形显示流水线中作公式化阐述。

### 计算机图形显示流水线

本节算是对前面知识的一个综合，起到一个串联的作用。我们现在应当知道，游戏世界里的顶点要显示在电脑屏幕上，经过了模型空间→世界空间→观察空间→（裁剪空间）→投影空间→屏幕空间的变换，最终才能确定在电脑屏幕上的位置。从模型空间到世界空间，我们用到了ModelToWorld矩阵；从世界空间到观察空间，我们用到了WorldToView矩阵，从观察空间到投影空间，我们用到了ViewToProjection矩阵。最重要的过程是从世界空间到投影空间的变换，这其中用到了WorldToView和ViewToProjection矩阵作乘法得到的复合变换矩阵ModelViewProjection Matrix，简称MVP Matrix，是游戏内存中最重要、最核心的矩阵。

这里我们对投影空间到屏幕空间坐标计算做一下公式化阐述：
$$
Screen.x = Proj.x \cdot \dfrac{ScreenWidth}{2} + \dfrac{ScreenWidth}{2} \\
Screen.y = -Proj.y \cdot \dfrac{ScreenHeight}{2} + \dfrac{ScreenHeight}{2}
$$

### 行优先矩阵 VS 列优先矩阵

在编写代码之前，我们先了解一下行优先矩阵和列优先矩阵分别是什么。根据维基百科的说法，它们是在计算机内存中线性存放矩阵的不同方式。顾名思义，行优先是指存放时一行一行地存储，先从左到右存完第一行，再从左到右存第二行，以此类推；列优先则是存放时一列一列地存储，先从上到下存完第一列，再从上到下存完第二列，以此类推。所以，如果我们把内存中的矩阵直接赋值给一个二维数组的首地址，那么行优先矩阵得到的数组和列优先矩阵得到的数组互为转置。这里可能有点绕，我们看一下下图就明白了。

![Row_and_column_major_order](<https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Row_and_column_major_order.svg/340px-Row_and_column_major_order.svg.png>)

### WorldToScreen函数代码编写

第一部分的最后，我们终于要将数学原理用代码实现了。这里给出C++的WorldToScreen函数代码：

```c++
bool WorldToScreen(Vec3f pos, Vec3f &screen, Matrix44f matrix, int windowWidth, int windowHeight)
{
	//Matrix-vector Product, multiplying world(eye) coordinates by projection matrix = clipCoords
	Vec4f clipCoords;
	clipCoords.x = pos.x * matrix[0][0] + pos.y * matrix[1][0] + pos.z * matrix[2][0] + matrix[3][0];
	clipCoords.y = pos.x * matrix[0][1] + pos.y * matrix[1][1] + pos.z * matrix[2][1] + matrix[3][1];
	clipCoords.z = pos.x * matrix[0][2] + pos.y * matrix[1][2] + pos.z * matrix[2][2] + matrix[3][2];
	clipCoords.w = pos.x * matrix[0][3] + pos.y * matrix[1][3] + pos.z * matrix[2][3] + matrix[3][3];

	if (clipCoords.w < 0.1f)
		return false;

	//perspective division, dividing by clip.W = Normalized Device Coordinates
	Vec3f NDC;
	NDC.x = clipCoords.x / clipCoords.w;
	NDC.y = clipCoords.y / clipCoords.w;
	NDC.z = clipCoords.z / clipCoords.w;

	//Transform to window coordinates
	screen.x = windowWidth / 2.0 * NDC.x + windowWidth / 2.0;
	screen.y = -(windowHeight / 2.0 * NDC.y)  + windowHeight / 2.0;
	return true;
}
```

注意，这段代码仅适用于OpenGL游戏，因为它使用的是列优先矩阵。如果是DirectX的游戏，使用的是行优先矩阵，则算法需要改变（相当于对矩阵乘法做了整体转置，则乘号两边的矩阵交换并各自取各自的转置）：

```c++
bool WorldToScreen(Vec3f pos, Vec3f &screen, Matrix44f matrix, int windowWidth, int windowHeight)
{
	//Matrix-vector Product, multiplying world(eye) coordinates by projection matrix = clipCoords
	Vec4f clipCoords;
	clipCoords.x = pos.x * matrix[0][0] + pos.y * matrix[0][1] + pos.z * matrix[0][2] + matrix[0][3];
	clipCoords.y = pos.x * matrix[1][0] + pos.y * matrix[1][1] + pos.z * matrix[1][2] + matrix[1][3];
	clipCoords.z = pos.x * matrix[2][0] + pos.y * matrix[2][1] + pos.z * matrix[2][2] + matrix[2][3];
	clipCoords.w = pos.x * matrix[3][0] + pos.y * matrix[3][1] + pos.z * matrix[3][2] + matrix[3][3];

	if (clipCoords.w < 0.1f)
		return false;

	//perspective division, dividing by clip.W = Normalized Device Coordinates
	Vec3f NDC;
	NDC.x = clipCoords.x / clipCoords.w;
	NDC.y = clipCoords.y / clipCoords.w;
	NDC.z = clipCoords.z / clipCoords.w;

	//Transform to window coordinates
	screen.x = windowWidth / 2.0 * NDC.x + windowWidth / 2.0;
	screen.y = -(windowHeight / 2.0 * NDC.y)  + windowHeight / 2.0;
	return true;
}
```

第一部分到这里就告一段落了。















