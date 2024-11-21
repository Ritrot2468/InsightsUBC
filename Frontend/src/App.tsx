import React, { useEffect, useState } from "react";
import DatasetInfoContainer from "./components/DatasetInfoContainer";
import UploadContainer from "./components/UploadContainer";
import { fetchDatasets, deleteDataset } from "./api";
import { InsightDataset } from "../../src/controller/IInsightFacade";
import InsightsContainer from "./components/InsightsContainer";
import Log from "@ubccpsc310/folder-test/build/Log";

function App() {
	const [datasets, setDatasets] = useState<InsightDataset[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [refreshKey] = useState(0);

	useEffect(() => {
		const getDatasets = async () => {
			try {
				const data = await fetchDatasets();
				Log.info(data.result);
				setDatasets(data.result);
			} catch (err) {
				setError("Failed to load datasets. Please try again later.");
			}
		};

		getDatasets();
	}, [refreshKey]);

	const handleUploadComplete = async () => {
		try {
			const data = await fetchDatasets();
			console.log(data);
			setDatasets(data.result);
		} catch {
			setError("Failed to reload datasets.");
		}
	};

	const handleDeleteDataset = async (datasetId: string) => {
		try {
			await deleteDataset(datasetId);
			setDatasets((prev) => prev.filter((dataset) => dataset.id !== datasetId));
		} catch {
			setError("Failed to delete dataset.");
		}
	};

	return (
		<div className="min-h-screen bg-blue-200 flex flex-col items-center p-6">
			<header className="text-center mb-6">
				<h1 className="text-3xl font-bold">InsightUBC</h1>
			</header>

			<div className="flex w-full gap-10 mt-4">
				{/* Upload Container */}
				<div className="flex-none w-full max-w-md">
					<UploadContainer onUploadComplete={handleUploadComplete} />
				</div>

				{/* Dataset Info Container */}
				<div className="w-full">
					<DatasetInfoContainer datasets={datasets} onDeleteDataset={handleDeleteDataset} />
				</div>
			</div>
			<div className="flex w-full mt-10">
				<InsightsContainer datasets={datasets} />
			</div>

			{/* Error Handling - Inspired by GPT*/}
			{error && <p className="text-red-500 mt-4">{error}</p>}
		</div>
	);
}

export default App;
