from ortools.linear_solver import pywraplp as lp
import numpy as np

x = [2, 7, 5, 2, 5, 1, 3, 2] # 27
y = [2, 3, 2, 2, 4, 6, 7, 1] # 27

solver = lp.Solver("mip", lp.Solver.CBC_MIXED_INTEGER_PROGRAMMING)

infinity = solver.infinity()

a = [[solver.IntVar(0.0, infinity, "a_{0}_{1}".format(i, j)) for j in range(8)] for i in range(8)]

for j in range(len(a)):
	solver.Add(sum([a[i][j] for i in range(8)]) == x[j])

for i in range(len(a)):
	solver.Add(sum([a[i][j] for j in range(8)]) == y[i])

solver.Minimize(sum([abs(i - j) * a[i][j] for i in range(8) for j in range(8)]))


print('Number of variables =', solver.NumVariables())
print('Number of constraints =', solver.NumConstraints())

result_status = solver.Solve()

print('Objective value =', solver.Objective().Value())

assert result_status == lp.Solver.OPTIMAL

assert solver.VerifySolution(1e-7, True)

a_vals = [ [a[i][j].solution_value() for j in range(8)] for i in range(8)]
print(np.array(a_vals))

print("OPT CSV:")
print("\\n".join([",".join([str(int(x)) for x in r]) for r in a_vals]))