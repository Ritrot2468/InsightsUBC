import React, { useEffect, useState } from "react";
import DatasetInfoContainer from "./DatasetInfoContainer";
import UploadContainer from "./UploadContainer";
import { fetchDatasets } from "./api";
import { InsightDataset } from "../../src/controller/IInsightFacade";

function App() {
	const [datasets, setDatasets] = useState<InsightDataset[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const getDatasets = async () => {
			try {
				const data = await fetchDatasets();
				setDatasets(data);
			} catch (err) {
				setError("Failed to load datasets. Please try again later.");
			}
		};

		getDatasets();
	}, []);

	const handleUploadComplete = () => {
		// Reload datasets after successful upload
		fetchDatasets()
			.then((data) => setDatasets(data))
			.catch(() => setError("Failed to reload datasets."));
	};

	return (
		<div className="min-h-screen bg-blue-200 flex flex-col items-center p-6">
			<header className="text-center mb-6">
				<h1 className="text-3xl font-bold">InsightUBC</h1>
			</header>

			<div className="flex w-full gap-9">
				{/* Upload Container */}
				<UploadContainer onUploadComplete={handleUploadComplete} />

				{/* Dataset Info Container */}
				<div className="w-full max-w-3xl mt-6">
					<DatasetInfoContainer datasets={datasets} />
				</div>
			</div>

			{/* Error Handling */}
			{error && <p className="text-red-500 mt-4">{error}</p>}
		</div>
	);
}

export default App;
