import React from "react";
import {InsightDataset} from "../../src/controller/IInsightFacade";
import Dataset from "./Dataset";


interface DatasetInfoContainerProps {
	datasets: InsightDataset[];
	onDeleteDataset: (datasetId: string) => void;
}

const DatasetInfoContainer: React.FC<DatasetInfoContainerProps> = ({ datasets, onDeleteDataset }) => {
	return (
		<div className="bg-white shadow-md p-6 rounded-md">
			<h2 className="text-center text-xl font-semibold mb-4">Your Section Datasets</h2>
			{datasets.length > 0 ? (
				<div className="space-y-4 max-h-80 overflow-y-auto w-full max-w-md">
					{datasets.map((dataset) => (
						<Dataset
							key={dataset.id}
							id={dataset.id}
							numRows={dataset.numRows.toString()}
							onClose={onDeleteDataset} // Pass delete function to Dataset
						/>
					))}
				</div>
			) : (
				<p className="text-gray-500">No datasets added yet.</p>
			)}
		</div>
	);
};

export default DatasetInfoContainer;
