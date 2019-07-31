from utils import *
import matplotlib.pyplot as plt
import scipy.stats
import cv2
from PIL import Image
import json
import plotly.graph_objects as go

from mpl_toolkits.mplot3d import Axes3D

# Generate matrices for wgan at each step by doing a ton of samples, quantizing, and setting the right indices
# Do this at each step

TARGET_M = np.array([2, 2])
TARGET_S = np.array(2)
TARGET_SLOPE = np.array([1, -1])


# Manifold learning
CRITIC_STEPS = 100

CLIP = 0.01

NUM_ITER = 10000

SAMPLE_SIZE = 64
LEARN_RATE = 0.0005

HALF_LR_EVERY = 20000

discriminator = Net([2, 32, 32, 32, 1], output="linear")
generator = Net([1, 32, 32, 32, 2], output="linear")

source = LineGaussian(TARGET_M, TARGET_S, TARGET_SLOPE)
unit = Gaussian(np.array([0]), np.eye(1))


disc_optim = torch.optim.RMSprop(discriminator.parameters(), lr=LEARN_RATE)
gen_optim = torch.optim.RMSprop(generator.parameters(), lr=LEARN_RATE)


big_sample = torch.tensor(np.linspace(-2, 2, 50).reshape((50, 1)), dtype=torch.float)

def make_surfacegaussian(generator):
	gen_samples = generator.forward(big_sample).detach().numpy()
	source_sample = source.sample(200)

	fig = plt.figure()
	ax = fig.add_subplot(111)
	ax.scatter(*gen_samples.T)
	ax.scatter(*source_sample.T)

	plt.xlim(0, 4)
	plt.ylim(0, 4)
	canvas = plt.get_current_fig_manager().canvas
	canvas.draw()

	return (np.array(Image.frombytes('RGB', canvas.get_width_height(),
								 canvas.tostring_rgb())), gen_samples)

points = []

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

	if(i % 20 == 0):
		frame, pts = make_surfacegaussian(generator)
		points.append(pts)
		avi.write(frame)
	if(i % HALF_LR_EVERY == (HALF_LR_EVERY - 1)):
		LEARN_RATE = LEARN_RATE/2
		disc_optim = torch.optim.RMSprop(discriminator.parameters(), lr=LEARN_RATE)
		gen_optim = torch.optim.RMSprop(generator.parameters(), lr=LEARN_RATE)

	print("Estimated mean: {0}".format(np.mean(gen_samples.detach().numpy(), axis=0)))
	print("Iter {0} - Approximated Wasserstein Distance: {1}".format(i, w1_estim))

np.save("w_points.json", json.dumps([[[round(float(x), 2) for x in y] for y in z] for z in points]))
