import React, { useState, useEffect, useMemo } from "react";
import DropdownInput from "./Dropdown";
import { queryDataset } from "../api";
import Log from "@ubccpsc310/folder-test/build/Log";
import { BarChartProf, BarChartYear, ScatterPlotYear } from "./Chart";

function InsightsContainer({ datasets }) {
	const [selectedDataset, setSelectedDataset] = useState(null);
	const [selectedInsight, setSelectedInsight] = useState(null);
	const [optionalDropdowns, setOptionalDropdowns] = useState([]);
	const [selectedYear, setSelectedYear] = useState(null);
	const [selectedDept, setSelectedDept] = useState(null);
	const [selectedId, setSelectedId] = useState(null);
	const [graph, setGraph] = useState(null);

	const datasetOptions = datasets.map((dataset) => dataset.id);

	// Memoizing insight options
	const insightOptions = useMemo(
		() => [
			"Courses with the highest average by year",
			"Professors with the lowest section averages by department",
			"Average of a course throughout the years",
		],
		[]
	);

	const handleSelectDataset = (event) => {
		setSelectedDataset(event.target.value);
	};

	const handleSelectInsight = (event) => {
		setSelectedInsight(event.target.value);
	};

	const handleSelectYear = (event) => {
		setSelectedYear(event.target.value);
	};

	const handleSelectDept = (event) => {
		setSelectedDept(event.target.value);
	};

	const handleSelectId = (event) => {
		setSelectedId(event.target.value);
	};

	// courses with the highest avg in a given year
	useEffect(() => {
		if (!selectedDataset || !selectedInsight) {
			setOptionalDropdowns([]);
			setGraph(null);
			return;
		}

		if (selectedInsight === insightOptions[0]) {
			// Fetch years and generate dropdown
			const fetchYears = async () => {
				const query = {
					WHERE: {},
					OPTIONS: {
						COLUMNS: [`${selectedDataset}_year`],
						ORDER: {
							dir: "DOWN",
							keys: [`${selectedDataset}_year`],
						},
					},
					TRANSFORMATIONS: {
						GROUP: [`${selectedDataset}_year`],
						APPLY: [
							{
								count: {
									COUNT: `${selectedDataset}_year`,
								},
							},
						],
					},
				};

				try {
					const data = await queryDataset(query);
					const yearOptions = data.result.map((item) => String(item[`${selectedDataset}_year`]));

					setOptionalDropdowns([
						<DropdownInput
							label="Year:"
							selection={selectedYear}
							selectHandler={handleSelectYear}
							defaultOption="Select a year"
							options={yearOptions}
						/>,
					]);
				} catch (err) {
					Log.error("Failed to query years.");
				}
			};

			fetchYears();
		}
	}, [selectedDataset, selectedInsight, insightOptions, selectedYear]);

	// generate plot
	useEffect(() => {
		if (selectedInsight === insightOptions[0] && selectedYear) {
			const fetchGraphData = async () => {
				const queryByYear = {
					WHERE: {
						EQ: {
							[`${selectedDataset}_year`]: parseInt(selectedYear, 10),
						},
					},
					OPTIONS: {
						COLUMNS: [`${selectedDataset}_dept`, `${selectedDataset}_id`, "avg"],
						ORDER: {
							dir: "DOWN",
							keys: ["avg"],
						},
					},
					TRANSFORMATIONS: {
						GROUP: [`${selectedDataset}_dept`, `${selectedDataset}_id`],
						APPLY: [
							{
								avg: {
									AVG: `${selectedDataset}_avg`,
								},
							},
						],
					},
				};

				try {
					const data = await queryDataset(queryByYear);
					setGraph(<BarChartYear dataList={data.result} selectedDataset={selectedDataset} />);
				} catch (err) {
					Log.error("Failed to query by year.");
				}
			};

			fetchGraphData();
		}
	}, [selectedDataset, selectedInsight, selectedYear, insightOptions]);

	// professors with the lowest section averages by dept
	// group by dept count query
	useEffect(() => {
		if (!selectedDataset || !selectedInsight) {
			setOptionalDropdowns([]);
			setGraph(null);
			return;
		}

		if (selectedInsight === insightOptions[1]) {
			// group by dept count query
			const fetchDept = async () => {
				const query = {
					WHERE: {},
					OPTIONS: {
						COLUMNS: [`${selectedDataset}_dept`],
						ORDER: {
							dir: "UP",
							keys: [`${selectedDataset}_dept`],
						},
					},
					TRANSFORMATIONS: {
						GROUP: [`${selectedDataset}_dept`],
						APPLY: [
							{
								count: {
									COUNT: `${selectedDataset}_dept`,
								},
							},
						],
					},
				};

				try {
					const data = await queryDataset(query);
					const deptOptions = data.result.map((item) => String(item[`${selectedDataset}_dept`]));

					setOptionalDropdowns([
						<DropdownInput
							label="Dept:"
							selection={selectedDept}
							selectHandler={handleSelectDept}
							defaultOption="Select a Dept"
							options={deptOptions}
						/>,
					]);
				} catch (err) {
					Log.error("Failed to query dept.");
				}
			};

			fetchDept();
		}
	}, [selectedDataset, selectedInsight, insightOptions, selectedDept]);

	// generate plot
	useEffect(() => {
		if (selectedInsight === insightOptions[1] && selectedDept) {
			const fetchGraphData = async () => {
				const queryByDept = {
					WHERE: {
						IS: {
							[`${selectedDataset}_dept`]: selectedDept,
						},
					},
					OPTIONS: {
						COLUMNS: [`${selectedDataset}_instructor`, "avg"],
						ORDER: {
							dir: "UP",
							keys: ["avg"],
						},
					},
					TRANSFORMATIONS: {
						GROUP: [`${selectedDataset}_instructor`],
						APPLY: [
							{
								avg: {
									AVG: `${selectedDataset}_avg`,
								},
							},
						],
					},
				};

				try {
					const data = await queryDataset(queryByDept);
					setGraph(<BarChartProf dataList={data.result} selectedDataset={selectedDataset} />);
				} catch (err) {
					Log.error("Failed to query by dept.");
				}
			};

			fetchGraphData();
		}
	}, [selectedDataset, selectedInsight, selectedDept, insightOptions]);

	// select id
	useEffect(() => {
		if (!selectedDataset || !selectedInsight) {
			setOptionalDropdowns([]);
			setGraph(null);
			return;
		}

		if (selectedInsight === insightOptions[2]) {
			// group by dept count query
			const fetchDept = async () => {
				const query = {
					WHERE: {},
					OPTIONS: {
						COLUMNS: [`${selectedDataset}_dept`],
						ORDER: {
							dir: "UP",
							keys: [`${selectedDataset}_dept`],
						},
					},
					TRANSFORMATIONS: {
						GROUP: [`${selectedDataset}_dept`],
						APPLY: [
							{
								count: {
									COUNT: `${selectedDataset}_dept`,
								},
							},
						],
					},
				};

				try {
					const data = await queryDataset(query);
					const deptOptions = data.result.map((item) => String(item[`${selectedDataset}_dept`]));
					const deptDropdown = (
						<DropdownInput
							label="Dept:"
							selection={selectedDept}
							selectHandler={handleSelectDept}
							defaultOption="Select a Dept"
							options={deptOptions}
						/>
					);
					setOptionalDropdowns([deptDropdown]);

					if (selectedDept) {
						const fetchId = async () => {
							const query = {
								WHERE: {
									IS: {
										[`${selectedDataset}_dept`]: selectedDept,
									},
								},
								OPTIONS: {
									COLUMNS: [`${selectedDataset}_id`],
									ORDER: {
										dir: "UP",
										keys: [`${selectedDataset}_id`],
									},
								},
								TRANSFORMATIONS: {
									GROUP: [`${selectedDataset}_id`],
									APPLY: [
										{
											count: {
												COUNT: `${selectedDataset}_id`,
											},
										},
									],
								},
							};

							try {
								const data = await queryDataset(query);
								const idOptions = data.result.map((item) => String(item[`${selectedDataset}_id`]));
								setOptionalDropdowns([
									deptDropdown,
									<DropdownInput
										label="Course ID:"
										selection={selectedId}
										selectHandler={handleSelectId}
										defaultOption="Select a course id"
										options={idOptions}
									/>,
								]);
							} catch (err) {
								Log.error("Failed to query course IDs.");
							}
						};
						fetchId();
					}
				} catch (err) {
					Log.error("Failed to query dept.");
				}
			};

			fetchDept();
		}
	}, [selectedDataset, selectedInsight, insightOptions, selectedDept, selectedId]);

	// generate plot
	useEffect(() => {
		if (selectedInsight === insightOptions[2] && selectedDept && selectedId) {
			const fetchGraphData = async () => {
				const queryByDeptAndId = {
					WHERE: {
						AND: [
							{
								IS: {
									[`${selectedDataset}_dept`]: selectedDept,
								},
							},
							{
								IS: {
									[`${selectedDataset}_id`]: selectedId,
								},
							},
							{
								NOT: {
									EQ: {
										[`${selectedDataset}_year`]: 1900,
									},
								},
							},
						],
					},
					OPTIONS: {
						COLUMNS: [`${selectedDataset}_year`, "avg"],
						ORDER: {
							dir: "UP",
							keys: [`${selectedDataset}_year`],
						},
					},
					TRANSFORMATIONS: {
						GROUP: [`${selectedDataset}_year`],
						APPLY: [
							{
								avg: {
									AVG: `${selectedDataset}_avg`,
								},
							},
						],
					},
				};

				try {
					const data = await queryDataset(queryByDeptAndId);
					setGraph(<ScatterPlotYear dataList={data.result} selectedDataset={selectedDataset} />);
				} catch (err) {
					Log.error("Failed to query by dept and id.");
				}
			};

			fetchGraphData();
		}
	}, [selectedDataset, selectedInsight, selectedDept, insightOptions, selectedId]);

	return (
		<div className="flex-cols min-h-92 w-full bg-white rounded-md justify-center p-6 shadow-md">
			<div className="flex text-3xl font-semibold justify-center">Insights</div>
			<div className="flex w-full my-10 pb-4">
				<div className="flex-col w-1/4">
					<DropdownInput
						label="Dataset ID:"
						selection={selectedDataset}
						selectHandler={handleSelectDataset}
						defaultOption="Select a dataset"
						options={datasetOptions}
					/>
					<DropdownInput
						label="Insight:"
						selection={selectedInsight}
						selectHandler={handleSelectInsight}
						defaultOption="Select an insight"
						options={insightOptions}
					/>
					<div>{optionalDropdowns}</div>
				</div>
				<div>{graph}</div>
			</div>
		</div>
	);
}

export default InsightsContainer;
