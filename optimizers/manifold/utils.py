import numpy as np
import torch.nn as nn
import torch

# Define the target gaussian
class Gaussian():
    def __init__(self, m, S):
        self.m = m
        self.S = S
        self.dim = m.flatten().shape[0]

    def sample(self, n):
        '''
        Return n samples of the same dimensionality as m
        :param n: number of samples to return
        :return: samples from this gaussian distribution
        '''
        return np.random.multivariate_normal(self.m, self.S, n)

class LineGaussian():
    def __init__(self, m, s, slope):
        self.m = m
        self.s = s
        self.slope = (slope / np.linalg.norm(slope))
    def sample(self, n):
        '''
        Return n samples of the same dimensionality as m, but in a 1D subspace. The slope vector will be added
        to m with its scale multiplied by a gaussian random variable.
        :param n: number of samples
        :return: samples from this gaussian distribution
        '''
        coeffs = np.random.normal(0, scale=self.s, size=(n,1))
        dists = coeffs * np.tile(self.slope, (n, 1))
        return self.m + dists

class Uniform():
    def __init__(self, low, high, dim):
        self.low = low
        self.high = high
        self.dim = dim
    def sample(self, n):
        return np.random.uniform(self.low, self.high, (n, self.dim))

class Generator(nn.Module):
    def __init__(self, input_dim, output_dim):
        super(Generator, self).__init__()
        self.out = nn.Linear(input_dim, output_dim, bias=True) # learn a linear transformation of gaussian
    def forward(self, input):
        return self.out(input)


class Net(nn.Module):
    # MLP net with set input dimensionality, given intermediate layer dims, and fixed outputs
    def __init__(self, layer_dims, output="linear"):
        super(Net, self).__init__()
        layers = []
        for i in range(1, len(layer_dims) - 1):
            layers.append(nn.Linear(layer_dims[i - 1], layer_dims[i]))
            layers.append(nn.ReLU(layer_dims[i - 1]))
        if(output=="sigmoid"):
            layers.append(nn.Linear(layer_dims[-2], layer_dims[-1]))
            layers.append(nn.Sigmoid())
        if(output=="linear"):
            layers.append(nn.Linear(layer_dims[-2], layer_dims[-1]))

        self.out = nn.Sequential(*layers)

    def forward(self, input):
        return self.out(input)

    def clip_weights(self, clip):
        for layer in self.out:
            if(isinstance(layer, nn.Linear)):
                layer.weight.data = np.clip(layer.weight.detach(), -clip, clip)





