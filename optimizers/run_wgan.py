from pytorch.utils import *
import numpy as np
import torch.nn as nn
import matplotlib.pyplot as plt
import torch

# Optimizing WGAN


# CONSTANTS

TARGET_M = np.array([0.1, 0.5])
TARGET_S = np.array([[0.7, 0], [0, 0]])

# Manifold learning
def line_sample(s):
    x = np.random.randn(s)
    x = x.reshape((-1, 1))
    y = (x-6)**3 + 4
    return np.concatenate((x,y), axis=1)

CRITIC_STEPS = 5

CLIP = 0.01

NUM_ITER = 10000

SAMPLE_SIZE = 64
LEARN_RATE = 0.00005

# Training

discriminator = Net([2, 512, 512, 512, 1], output="linear")
generator = Net([1, 128, 128, 128, 2], output="linear")

source = Gaussian(TARGET_M, TARGET_S)
unit = Gaussian(np.array([0]), np.array([[1]]))

disc_optim = torch.optim.RMSprop(discriminator.parameters(), lr=LEARN_RATE)
gen_optim = torch.optim.RMSprop(generator.parameters(), lr=LEARN_RATE)


for i in range(NUM_ITER):
    for k in range(CRITIC_STEPS):
        unit_samples = torch.tensor(unit.sample(SAMPLE_SIZE), dtype=torch.float)
        #source_samples = torch.tensor(source.sample(SAMPLE_SIZE), dtype=torch.float)
        source_samples = torch.tensor(line_sample(SAMPLE_SIZE), dtype=torch.float)

        gen_samples = generator.forward(unit_samples).detach()
        w1_estim = torch.mean(discriminator.forward(gen_samples)) - torch.mean(discriminator.forward(source_samples))
        w1_estim.backward()
        disc_optim.step()
        disc_optim.zero_grad()
        gen_optim.zero_grad()
        discriminator.clip_weights(CLIP)

    unit_samples = torch.tensor(unit.sample(SAMPLE_SIZE), dtype=torch.float)
    gen_samples = generator.forward(unit_samples)
    w1_grad_estim = -torch.mean(discriminator.forward(gen_samples))

    w1_grad_estim.backward()
    gen_optim.step()
    disc_optim.zero_grad()
    gen_optim.zero_grad()

    source_samples = torch.tensor(line_sample(SAMPLE_SIZE), dtype=torch.float)
    if(i % 100 == 0):
        plt.scatter(gen_samples.data[:, 0], gen_samples.data[:, 1])
        plt.scatter(source_samples[:, 0], source_samples[:, 1])
        plt.show()

    print("Estimated mean: {0}".format(np.mean(gen_samples.detach().numpy(), axis=0)))
    print("Iter {0} - Approximated Wasserstein Distance: {1}".format(i, w1_estim))
