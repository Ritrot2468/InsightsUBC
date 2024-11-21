import React, { useState, useEffect } from "react";
import { InsightDataset } from "../../../src/controller/IInsightFacade";
import Dataset from "../Dataset";
import DropdownInput from "./Dropdown";
import { queryDataset } from "../api";
import Log from "@ubccpsc310/folder-test/build/Log";
import { InsightResult } from "../../../src/controller/IInsightFacade";

interface InsightsContainerProps {
	datasets: InsightDataset[];
}

interface Query {
	WHERE: object,


}

function InsightsContainer({ datasets }: InsightsContainerProps): React.ReactElement {
	const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
	const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
	const [optionalDropdowns, setOptionalDropdowns] = useState<React.ReactElement[] | null>([]);
	const [selectedYear, setSelectedYear] = useState<string | null>(null);
	const [queryResult, setQueryResult] = useState<InsightResult[]>([]);

	const datasetOptions: string[] = datasets.map((dataset) => dataset.id);
	const insightOptions: string[] = [
		"Courses with the highest average by year",
		"Professors with the lowest section averages by department",
		"Average of a course througout the years",
	];

	const handleSelectDataset = (event: React.ChangeEvent<HTMLSelectElement>): void => {
		setSelectedDataset(event.target.value);
		handleInsights();
	};

	const handleSelectInsight = (event: React.ChangeEvent<HTMLSelectElement>): void => {
		setSelectedInsight(event.target.value);
		handleInsights();
	};

	const handleSelectYear = (event: React.ChangeEvent<HTMLSelectElement>): void => {
		setSelectedYear(event.target.value);
		handleInsights();
	};

	useEffect(() => {
		handleInsights();
	});

	let graph;
	function handleInsights(): void {
		console.log(selectedInsight);
		console.log(selectedDataset);
		if (selectedInsight === null || selectedDataset === null) {
			setOptionalDropdowns([]);
		} else if (selectedInsight === insightOptions[0]) {
			const intermediateResult: InsightResult[] = [];
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
					"EQ": {
						`${selectedDataset}_year`:`${selectedYear}`
					}
				},
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
			const performQuery = async () => {
				try {
					const data = await queryDataset(query);
					Log.info(data.result);
					setQueryResult(data.result);
				} catch (err) {
					Log.error("Failed to query years.");
				}
			};
			performQuery();

			if (queryResult !== undefined) {
				const yearOptions: string[] = queryResult.map((insight) => {
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

			const performQueryFinal = async () => {
				try {
					const data = await queryDataset(query);
				}
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
	}

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
				<div>{}</div>
			</div>
		</div>
	);
}

export default InsightsContainer;
