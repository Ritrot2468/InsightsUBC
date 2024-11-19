import React from "react";
import {InsightDataset} from "../../src/controller/IInsightFacade";


interface DatasetInfoContainerProps {
	datasets: InsightDataset[];
}

const DatasetInfoContainer: React.FC<DatasetInfoContainerProps> = ({ datasets }) => {
	return (
		<div className="bg-white shadow-md p-6 rounded-md">
			<h2 className="text-xl font-semibold mb-4">Added Datasets</h2>
			{datasets.length > 0 ? (
				<div className="space-y-4">
					{datasets.map((dataset) => (
						<div key={dataset.id} className="border p-4 rounded-md bg-gray-50">
							<p>
								<strong className="text-gray-700">ID:</strong> {dataset.id}
							</p>
							<p>
								<strong className="text-gray-700">Number of Sections:</strong> {dataset.numRows} bytes
							</p>
						</div>
					))}
				</div>
			) : (
				<p className="text-gray-500">No datasets added yet.</p>
			)}
		</div>
	);
};

export default DatasetInfoContainer;
