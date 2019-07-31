from utils import *
import matplotlib.pyplot as plt
import scipy.stats
import cv2
from PIL import Image
import plotly.graph_objects as go

from mpl_toolkits.mplot3d import Axes3D

# Generate matrices for wgan at each step by doing a ton of samples, quantizing, and setting the right indices
# Do this at each step

TARGET_M = np.array([4, 4])
TARGET_S = np.array([[0.5, 0.1], [0.1, 0.2]])

CRITIC_STEPS = 20


NUM_ITER = 1500

SAMPLE_SIZE = 64
LEARN_RATE = 0.00005


discriminator = Net([2, 512, 512, 512, 1], output="sigmoid")
generator = Net([2, 128, 128, 128, 2], output="linear")

source = Gaussian(TARGET_M, TARGET_S)
unit = Gaussian(np.array([0, 0]), np.array([[1, 0], [0, 1]]))
#unit = Uniform(-1, 1, 2)

disc_optim = torch.optim.RMSprop(discriminator.parameters(), lr=LEARN_RATE)
gen_optim = torch.optim.RMSprop(generator.parameters(), lr=LEARN_RATE)


def make_surfacemap(generator):
    quant = 0.01
    def to_idx(n):
        if(isinstance(n, int)):
            return int((n+range) / quant)
        else:
            return ((n+range) / quant).astype(int)
    def from_idx(n):
        return (n*quant) - range
    big_sample = torch.tensor(unit.sample(5000), dtype=torch.float)
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

def make_surfacegaussian(generator):
    big_sample = torch.tensor(unit.sample(5000), dtype=torch.float)
    gen_samples = generator.forward(big_sample).detach().numpy()
    mean = np.mean(gen_samples, axis=0)
    cov = np.cov(gen_samples, rowvar=False)
    range = [2, 6]
    quant = 0.01

    XY = np.meshgrid(np.arange(range[0], range[1] , quant), np.arange(range[0], range[1], quant))
    X, Y = XY
    XY = np.transpose(XY, (1, 2, 0))
    Z_gen = scipy.stats.multivariate_normal.pdf(XY, mean=mean, cov=cov)

    Z_source = scipy.stats.multivariate_normal.pdf(XY, mean=TARGET_M, cov=TARGET_S)
    fig = plt.figure()
    ax = fig.add_subplot(111)
    ax.contour(X, Y, Z_gen)
    ax.contour(X, Y, Z_source)
    canvas = plt.get_current_fig_manager().canvas
    canvas.draw()

    return (np.array(Image.frombytes('RGB', canvas.get_width_height(),
                                    canvas.tostring_rgb())), [mean, cov])

surfacemaps = []

avi = cv2.VideoWriter("gan_nice.avi", cv2.VideoWriter_fourcc('M','J','P','G'), 20.0, (640, 480))



for i in range(NUM_ITER):
    for k in range(CRITIC_STEPS):
        unit_samples = torch.tensor(unit.sample(SAMPLE_SIZE), dtype=torch.float)
        source_samples = torch.tensor(source.sample(SAMPLE_SIZE), dtype=torch.float)

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

    source_samples = torch.tensor(source.sample(SAMPLE_SIZE), dtype=torch.float)

    if(i % 2 == 0):
        frame, fig = make_surfacegaussian(generator)
        surfacemaps.append(fig)
        avi.write(frame)

    print("Estimated mean: {0}".format(np.mean(gen_samples.detach().numpy(), axis=0)))

np.save("frame_mean.npy", np.array([x[0] for x in surfacemaps]))
np.save("frame_cov.npy", np.array([x[1] for x in surfacemaps]))
