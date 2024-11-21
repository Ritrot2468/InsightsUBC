import React, { useState } from "react";
import { InsightResult } from "../../../src/controller/IInsightFacade";
import { queryDataset } from "../api";
import Log from "@ubccpsc310/folder-test/build/Log";
import DropdownInput from "./Dropdown";

interface InsightsProps {
	selectedDataset: string;
}

function InsightsYear({ selectedDataset }: InsightsProps) {
	const [selectedYear, setSelectedYear] = useState<string | null>(null);
	const [queryResult, setQueryResult] = useState<InsightResult[]>([]);
	const [queryIntermediate, setQueryIntermediate] = useState<InsightResult[]>([]);

	const handleSelectYear = (event: React.ChangeEvent<HTMLSelectElement>): void => {
		setSelectedYear(event.target.value);
	};

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

	const performQuery = async () => {
		try {
			const data = await queryDataset(query);
			Log.info(data.result);
			setQueryIntermediate(data.result);
		} catch (err) {
			Log.error("Failed to query years.");
		}
	};

	performQuery();

	if (queryIntermediate !== undefined) {
		const yearOptions: string[] = queryIntermediate.map((insight) => {
			return String(insight[`${selectedDataset}_year`]);
		});
		return (
			<DropdownInput
				label="Year:"
				selection={selectedYear}
				selectHandler={handleSelectYear}
				defaultOption="Select a year"
				options={yearOptions}
			/>
		);
	} else {
		return <div></div>;
	}
}

export { InsightsYear };
