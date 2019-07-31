from utils import *
import matplotlib.pyplot as plt
import scipy.stats
import cv2
from PIL import Image
import plotly.graph_objects as go

from mpl_toolkits.mplot3d import Axes3D

# Generate matrices for wgan at each step by doing a ton of samples, quantizing, and setting the right indices
# Do this at each step

TARGET_M = np.array([2, 2])
TARGET_S = np.array(2)
TARGET_SLOPE = np.array([1, -1])

CRITIC_STEPS = 100


NUM_ITER = 10000

SAMPLE_SIZE = 64
LEARN_RATE = 0.00005


discriminator = Net([2, 32, 32, 32, 1], output="sigmoid")
generator = Net([1, 32, 32, 32, 2], output="linear")

source = LineGaussian(TARGET_M, TARGET_S, TARGET_SLOPE)
unit = Gaussian(np.array([0]), np.eye(1))

disc_optim = torch.optim.RMSprop(discriminator.parameters(), lr=LEARN_RATE)
gen_optim = torch.optim.RMSprop(generator.parameters(), lr=LEARN_RATE)


big_sample = torch.tensor(np.linspace(-2, 2, 50), dtype=torch.float)

def make_surfacegaussian(generator):
	big_sample = torch.tensor(unit.sample(50), dtype=torch.float)
	gen_samples = generator.forward(big_sample).detach().numpy()
	source_sample = source.sample(50)


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

avi = cv2.VideoWriter("gan_nice.avi", cv2.VideoWriter_fourcc('M','J','P','G'), 20.0, (640, 480))

for k in range(100):
	unit_samples = torch.tensor(unit.sample(SAMPLE_SIZE), dtype=torch.float)
	source_samples = torch.tensor(source.sample(SAMPLE_SIZE), dtype=torch.float)

	gen_samples = generator.forward(unit_samples).detach()
	disc_loss = -torch.mean(torch.log(discriminator(source_samples)) + torch.log(1 - discriminator(gen_samples)))
	disc_loss.backward()
	disc_optim.step()
	disc_optim.zero_grad()
	gen_optim.zero_grad()


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

	if(i % 20 == 0):
		frame, pts = make_surfacegaussian(generator)
		points.append(pts)
		avi.write(frame)

	print("{1}, Estimated mean: {0}".format((np.mean(gen_samples.detach().numpy(), axis=0)), i))


np.save("g_points.npy", np.array(points))
