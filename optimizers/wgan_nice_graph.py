from utils import *
import matplotlib.pyplot as plt
import scipy.stats
import cv2
from PIL import Image
import plotly.graph_objects as go

from mpl_toolkits.mplot3d import Axes3D

# Generate matrices for wgan at each step by doing a ton of samples, quantizing, and setting the right indices
# Do this at each step

TARGET_M = np.array([1.0, 1.4])
TARGET_S = np.array([[0.5, 0.1], [0.1, 0.2]])

# Manifold learning
CRITIC_STEPS = 1

CLIP = 0.01

NUM_ITER = 5000

SAMPLE_SIZE = 64
LEARN_RATE = 0.0005

HALF_LR_EVERY = 5000

discriminator = Net([2, 128, 128, 128, 1], output="linear")
generator = Net([2, 128, 128, 128, 2], output="linear")

source = Gaussian(TARGET_M, TARGET_S)
#unit = Gaussian(np.array([0]), np.array([[5]]))
unit = Uniform(-1, 1, 2)

disc_optim = torch.optim.RMSprop(discriminator.parameters(), lr=LEARN_RATE)
gen_optim = torch.optim.RMSprop(generator.parameters(), lr=LEARN_RATE)


def make_surfacegaussian(generator):
    big_sample = torch.tensor(unit.sample(5000), dtype=torch.float)
    gen_samples = generator.forward(big_sample).detach().numpy()
    mean = np.mean(gen_samples, axis=0)
    cov = np.cov(gen_samples, rowvar=False)
    range = [-1, 3]
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

avi = cv2.VideoWriter("wgan_nice.avi", cv2.VideoWriter_fourcc('M','J','P','G'), 20.0, (640, 480))



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

    if(i % 2 == 0):
        frame, fig = make_surfacegaussian(generator)
        surfacemaps.append(fig)
        avi.write(frame)
    if(i % HALF_LR_EVERY == (HALF_LR_EVERY - 1)):
        LEARN_RATE = LEARN_RATE/2
        disc_optim = torch.optim.RMSprop(discriminator.parameters(), lr=LEARN_RATE)
        gen_optim = torch.optim.RMSprop(generator.parameters(), lr=LEARN_RATE)

    print("Estimated mean: {0}".format(np.mean(gen_samples.detach().numpy(), axis=0)))
    print("Iter {0} - Approximated Wasserstein Distance: {1}".format(i, w1_estim))

np.save("w_frame_mean.npy", np.array([x[0] for x in surfacemaps]))
np.save("w_frame_cov.npy", np.array([x[1] for x in surfacemaps]))
