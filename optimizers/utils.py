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





