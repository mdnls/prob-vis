from utils import *
import matplotlib.pyplot as plt

# Generate matrices for wgan at each step by doing a ton of samples, quantizing, and setting the right indices
# Do this at each step

TARGET_M = np.array([0.1, 0.5])
TARGET_S = np.array([[0.7, 0.3], [0.3, 0.4]])

# Manifold learning
CRITIC_STEPS = 5

CLIP = 0.01

NUM_ITER = 10000

SAMPLE_SIZE = 64
LEARN_RATE = 0.00005


discriminator = Net([2, 128, 128, 128, 1], output="linear")
generator = Net([1, 128, 128, 128, 2], output="linear")

source = Gaussian(TARGET_M, TARGET_S)
unit = Gaussian(np.array([0]), np.array([[1]]))

disc_optim = torch.optim.RMSprop(discriminator.parameters(), lr=LEARN_RATE)
gen_optim = torch.optim.RMSprop(generator.parameters(), lr=LEARN_RATE)


def make_surfacemap(generator):
    range = 0.2
    quant = 0.001
    def to_idx(n):
        if(isinstance(n, int)):
            return int((n+range) / quant)
        else:
            return ((n+range) / quant).astype(int)
    def from_idx(n):
        return (n*quant) - range
    big_sample = torch.tensor(unit.sample(10000), dtype=torch.float)
    gen_samples = generator.forward(big_sample).detach().numpy()
    mat = np.zeros((2*int(range/quant), 2*int(range/quant)))
    for x, y in gen_samples:
        mat[to_idx(x), to_idx(y)] += 1
    mat /= np.sum(mat)
    idxs = np.nonzero(mat)
    z = mat[idxs]
    a = (from_idx(idxs[0]).reshape((-1, 1)), from_idx(idxs[1]).reshape((-1, 1)), z.reshape((-1, 1)))

    X, Y = np.meshgrid(np.arange(-range, range, quant), np.arange(-range, range, quant))
    Z = mat[to_idx(X), to_idx(Y)]

    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')
    ax.plot_surface(X, Y, Z)
    plt.show()
    return a

surfacemaps = []
for i in range(NUM_ITER):
    for k in range(CRITIC_STEPS):
        unit_samples = torch.tensor(unit.sample(SAMPLE_SIZE), dtype=torch.float)
        source_samples = torch.tensor(source.sample(SAMPLE_SIZE), dtype=torch.float)

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

    source_samples = torch.tensor(source.sample(SAMPLE_SIZE), dtype=torch.float)

    surfacemaps.append(make_surfacemap(generator))

    print("Estimated mean: {0}".format(np.mean(gen_samples.detach().numpy(), axis=0)))
    print("Iter {0} - Approximated Wasserstein Distance: {1}".format(i, w1_estim))