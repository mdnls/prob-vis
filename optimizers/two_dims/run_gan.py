from utils import *
import numpy as np
import matplotlib.pyplot as plt
import torch


# CONSTANTS
TARGET_M = np.array([2, 2])
TARGET_S = np.array([[0.7, 0], [0, 0]])

# manifold learning
def line_sample(s):
    x = np.random.randn(s)
    x = x.reshape((-1, 1))
    y = np.full_like(x, 20)
    return np.concatenate((x,y), axis=1)

CRITIC_STEPS = 1

CLIP = 0.01

NUM_ITER = 10000

SAMPLE_SIZE = 64
LEARN_RATE = 0.00005

# Training

discriminator = Net([2, 512, 512, 512, 1], output="sigmoid")
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
        disc_loss = -torch.mean(torch.log(discriminator(source_samples)) + torch.log(1 - discriminator(gen_samples)))
        disc_loss.backward()
        disc_optim.step()
        disc_optim.zero_grad()
        gen_optim.zero_grad()

    unit_samples = torch.tensor(unit.sample(SAMPLE_SIZE), dtype=torch.float)
    gen_samples = generator.forward(unit_samples)
    gen_loss = torch.mean(torch.log(1 - discriminator(gen_samples)))
    gen_loss.backward()
    gen_optim.step()
    disc_optim.zero_grad()
    gen_optim.zero_grad()

    #source_samples = source.sample(SAMPLE_SIZE)
    source_samples = torch.tensor(line_sample(SAMPLE_SIZE), dtype=torch.float)
    if(i % 100 == 0):
        plt.scatter(gen_samples.data[:, 0], gen_samples.data[:, 1])
        plt.scatter(source_samples[:, 0], source_samples[:, 1])
        plt.show()

    print("Estimated mean: {0}".format(np.mean(gen_samples.detach().numpy(), axis=0)))
    print("Iter {0} - Discriminator Loss: {1}".format(i, disc_loss))