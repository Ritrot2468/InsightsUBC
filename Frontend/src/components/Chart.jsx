import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BarChartYear = ({ dataList }) => {
	// Transform the data
	const labels = dataList.map((insight) => insight.dept + insight.id);
	const dataValues = dataList.map((insight) => insight.avg);

	// Chart.js configuration
	const data = {
		labels,
		datasets: [
			{
				label: "Course averages",
				data: dataValues,
				backgroundColor: [
					"rgba(255, 99, 132, 0.2)",
					"rgba(54, 162, 235, 0.2)",
					"rgba(255, 206, 86, 0.2)",
					"rgba(75, 192, 192, 0.2)",
				],
				borderColor: [
					"rgba(255, 99, 132, 1)",
					"rgba(54, 162, 235, 1)",
					"rgba(255, 206, 86, 1)",
					"rgba(75, 192, 192, 1)",
				],
				borderWidth: 1,
			},
		],
	};

	const options = {
		responsive: true,
		plugins: {
			legend: {
				position: "top",
			},
			title: {
				display: true,
				text: "Courses with the highest averages",
			},
		},
		scales: {
			y: {
				beginAtZero: true,
			},
		},
	};

	return <Bar data={data} options={options} />;
};

export { BarChartYear };
