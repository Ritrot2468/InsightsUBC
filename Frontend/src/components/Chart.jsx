import React from "react";
import { Bar, Scatter } from "react-chartjs-2";
import Log from "@ubccpsc310/folder-test/build/Log";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	BarElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function BarChartYear({ dataList, selectedDataset }) {
	// Transform the data
	const labels = dataList.map((insight) => insight[`${selectedDataset}_dept`] + insight[`${selectedDataset}_id`]);
	const dataValues = dataList.map((insight) => insight.avg);

	console.log(labels);
	Log.info(labels);

	// Chart.js configuration
	const data = {
		labels,
		datasets: [
			{
				label: "Course averages",
				data: dataValues,
				backgroundColor: ["rgba(54, 162, 235, 0.2)"],
				borderColor: ["rgba(54, 162, 235, 1)"],
				borderWidth: 1,
			},
		],
	};

	const options = {
		indexAxis: "y", // Switch to horizontal bar graph
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: "top",
			},
			title: {
				display: true,
				text: "Course averages from highest to lowest",
				font: {
					size: 20,
				},
			},
		},
		scales: {
			x: {
				beginAtZero: true,
				title: {
					display: true,
					text: "Average Score",
					font: {
						size: 16,
					},
				},
			},
			y: {
				title: {
					display: true,
					text: "Courses",
					font: {
						size: 16,
					},
				},
			},
		},
	};

	const chartHeight = Math.max(dataList.length * 20, 400);
	const chartWidth = 800;

	return (
		<div className="w-2/3" style={{ height: `${chartHeight}px`, width: `${chartWidth}px`, margin: "auto" }}>
			<Bar data={data} options={options} />
		</div>
	);
}

function BarChartProf({ dataList, selectedDataset }) {
	// Transform the data
	const labels = dataList.map((insight) => insight[`${selectedDataset}_instructor`]);
	const dataValues = dataList.map((insight) => insight.avg);

	console.log(labels);
	Log.info(labels);

	// Chart.js configuration
	const data = {
		labels,
		datasets: [
			{
				label: "Professor section averages",
				data: dataValues,
				backgroundColor: ["rgba(54, 162, 235, 0.2)"],
				borderColor: ["rgba(54, 162, 235, 1)"],
				borderWidth: 1,
			},
		],
	};

	const options = {
		indexAxis: "y", // Switch to horizontal bar graph
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: "top",
			},
			title: {
				display: true,
				text: "Professors sections' average from lowest to highest",
				font: {
					size: 20,
				},
			},
		},
		scales: {
			x: {
				beginAtZero: true,
				title: {
					display: true,
					text: "Sections average",
					font: {
						size: 16,
					},
				},
			},
			y: {
				title: {
					display: true,
					text: "Teaching team",
					font: {
						size: 16,
					},
				},
			},
		},
	};

	const chartHeight = Math.max(dataList.length * 20, 400);
	const chartWidth = 800;

	return (
		<div style={{ height: `${chartHeight}px`, width: `${chartWidth}px`, margin: "auto" }}>
			<Bar data={data} options={options} />
		</div>
	);
}

function ScatterPlotYear({ dataList, selectedDataset }) {
	const data = dataList.map((insight) => ({
		x: insight[`${selectedDataset}_year`],
		y: insight["avg"],
	}));

	console.log(data);
	const min = data.reduce((min, item) => Math.min(min, item.x), Infinity);
	const max = data.reduce((max, item) => Math.max(max, item.x), -Infinity);

	console.log(min);
	console.log(max);

	const chartData = {
		datasets: [
			{
				label: "Average Score by Course",
				data: data,
				backgroundColor: ["rgba(54, 162, 235, 0.2)"],
				borderColor: ["rgba(54, 162, 235, 1)"],
				showLine: true, // Enable the line connecting the points
				borderWidth: 2, // Optional: Set line thickness
				pointRadius: 4, // Optional: Customize point size
			},
		],
	};

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: "top",
				labels: {
					font: {
						size: 16,
					},
				},
			},
			title: {
				display: true,
				text: "Course averages over the years",
				font: {
					size: 20,
				},
			},
		},
		scales: {
			x: {
				title: {
					display: true,
					text: "Year",
					font: {
						size: 16,
					},
				},
				min: min - 1,
				max: max + 1,
				ticks: {
					stepSize: 1,
					font: {
						size: 14,
					},
				},
			},
			y: {
				title: {
					display: true,
					text: "Course Average",
					font: {
						size: 16,
					},
				},
				ticks: {
					font: {
						size: 14,
					},
				},
			},
		},
	};

	const chartHeight = Math.max(dataList.length * 20, 400);
	const chartWidth = 800;
	return (
		<div style={{ height: `${chartHeight}px`, width: `${chartWidth}px`, margin: "auto" }}>
			<Scatter data={chartData} options={chartOptions} />
		</div>
	);
}

export { BarChartYear, BarChartProf, ScatterPlotYear };
