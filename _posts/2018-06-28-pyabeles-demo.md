---
layout: single
title:  "Exploring PyAbeles for X-ray curve fitting"
date:   2018-06-28 10:16:25 -0400
categories: notebook pyabeles
---

I just released an [initial commit of PyAbeles](https://github.com/MiroFurtado/pyabeles), a library for X-ray reflectivity curve simulation and fitting of experimental data using differential evolution (an evolutionary algorithm for global optimization).

PyAbeles can easily be installed using ```pip install pyabeles```, although you should already have the Anaconda scientific computing environment installed (I have yet to correctly set up the dependencies). Now, let's try to use it to fit some data.

The fundamental object in PyAbeles is the ```Structure```, which represents the multilayer that is to be identified. We can start by defining a simple structure composed of LSMO on top of STO.

{% highlight python %}
LSMO = pa.Layer(250.,6.6, sigma=5.85, name="LSMO")
STO = pa.Layer(0.,5.246,sigma=0.26,name="STO")

#Define a Structure made of LSMO on top of STO
struct = LSMO+STO
{% endhighlight %}

Now, we want to set up an ```Experiment``` object to represent the experiment that we've conducted on this multilayer. Let's assume that we have the data defined as ```hoffmanTheta``` and ```hoffmanR``` for angle and reflectivity respectively. 

{% highlight python %}
exp = struct.doExperiment(hoffmanTheta, R=hoffmanR)
{% endhighlight %}

Finally, we want to create a ```Fitter``` object for this experiment that will be responsible for handling the *inverse problem*, that is going from the reflectivity curve to the structure of the multilayer.

{% highlight python %}
#Define a model that will fit exp using differential evolution
model = Fitter(exp,method="de")

# We will manually set bounds, although allowing for smatter automatic bounds for DE is in the works!
model.bounds = [(0.75, 1.25), (0.0, 1.9999999999999999e-06),(-0.20000000000000001, 0.20000000000000001),(0.1, 10.0),(200.0, 400.0),
(0.0, 0.0),(4.9499999999999993, 8.25),(3.9345000000000003, 6.557500000000001),(4.3874999999999993, 7.3125),(0.19500000000000001, 0.32500000000000001)]

determined_surface = model.fit()
{% endhighlight %}

![X-Ray reflectivity Plot](/assets/XrayCurveFit.png)

Not too shabby a fit at all! The determined thickness of the LSMO layer is 30.9 nm, not far from the 30 nm that it is supposed to be, especially when we told it it could be anywhere between 20.0 and 40.0 

There's still a lot of work to be done (like trnasitioning function names from camelCase to PEP8 compliant snake_case), but this seems like a good start.