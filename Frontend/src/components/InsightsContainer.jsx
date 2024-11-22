import React, { useState, useEffect, useRef } from "react";
import DropdownInput from "./Dropdown";
import { queryDataset } from "../api";
import Log from "@ubccpsc310/folder-test/build/Log";
import { BarChartYear } from "./Chart";

const insightOptions = [
	"Courses with the highest average by year",
	"Professors with the lowest section averages by department",
	"Average of a course throughout the years",
];

function InsightsContainer({ datasets }) {
	const [selectedDataset, setSelectedDataset] = useState(null);
	const [selectedInsight, setSelectedInsight] = useState(null);
	const [optionalDropdowns, setOptionalDropdowns] = useState([]);
	const [selectedYear, setSelectedYear] = useState(null);
	const [queryResult, setQueryResult] = useState([]);
	const [graph, setGraph] = useState(null);

	const datasetOptions = datasets.map((dataset) => dataset.id);

	const handleSelectDataset = (event) => {
		setSelectedDataset(event.target.value);
	};

	const handleSelectInsight = (event) => {
		setSelectedInsight(event.target.value);
	};

	const handleSelectYear = (event) => {
		setSelectedYear(event.target.value);
	};

	useEffect(() => {
		if (selectedInsight === null || selectedDataset === null) {
			setOptionalDropdowns([]);
			return;
		} else if (selectedInsight === insightOptions[0]) {
			let intermediateResult = [];
			// courses w highest avg by year
			// group by year count query
			// `${selectedDataset}_year`
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
			const queryByYear = {
				WHERE: {
					EQ: {
						[`${selectedDataset}_year`]: `${selectedYear}`,
					},
				},
				OPTIONS: {
					COLUMNS: [`${selectedDataset}_dept`, `${selectedDataset}_id`, `${selectedDataset}_avg`],
					ORDER: {
						dir: "DOWN",
						keys: [`${selectedDataset}_avg`],
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
			const performQuery = async () => {
				try {
					const data = await queryDataset(query);
					intermediateResult = data.result;
				} catch (err) {
					Log.error("Failed to query years.");
				}
			};
			performQuery();

			if (queryResult !== undefined) {
				const yearOptions = intermediateResult.map((insight) => {
					return String(insight[`${selectedDataset}_year`]);
				});
				setOptionalDropdowns([
					<DropdownInput
						label="Year:"
						selection={selectedYear}
						selectHandler={handleSelectYear}
						defaultOption="Select a year"
						options={yearOptions}
					/>,
				]);
			}
			if (selectedYear !== null) {
				const performQueryFinal = async () => {
					try {
						const data = await queryDataset(queryByYear);
						Log.info(data.result);
						setQueryResult(data.result);
					} catch (err) {
						Log.error("Failed to query by year.");
					}
				};
				performQueryFinal();
				setGraph(<BarChartYear dataList={queryResult} />);
			}
		} else if (selectedInsight === insightOptions[1]) {
			// professors with the lowest section averages by dept
			// group by dept count query
		} else if (selectedInsight === insightOptions[2]) {
			// avg of a course throughout the years
			// group by dept count query
			// filter dept group by id count query
			// group by
		}
	}, [selectedDataset, selectedInsight, selectedYear, queryResult]);

	return (
		<div className="flex-cols min-h-full w-full bg-white rounded-md justify-center p-6 shadow-md">
			<div className="flex text-3xl font-semibold justify-center">Insights</div>
			<div className="flex w-full mt-6">
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
