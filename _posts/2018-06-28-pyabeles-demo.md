---
layout: single
title:  "Exploring PyAbeles for X-ray curve fitting"
date:   2018-06-28 10:16:25 -0400
categories: notebook pyabeles
---

I just released an ![initial commit of PyAbeles](https://github.com/MiroFurtado/pyabeles), a library for X-ray reflectivity curve simulation and fitting of experimental data using differential evolution (an evolutionary algorithm for global optimization). What follows is a brief demonstration of how it works and an application to some data measured by a researcher at the Hoffman lab.

PyAbeles can easily be installed using ```pip install pyabeles```, although you should already have the Anaconda scientific computing environment installed. 

The fundamental object in PyAbeles is the ```Structure```, which represents the multilayer that is to be identified. We can start by defining a simple structure composed of LSMO on top of STO.

{% highlight python %}
LSMO = pa.Layer(250.,6.6, sigma=5.85, name="LSMO")
STO = pa.Layer(0.,5.246,sigma=0.26,name="STO")
struct = LSMO+STO #Define a structure made of LSMO on top of STO
{% endhighlight %}
