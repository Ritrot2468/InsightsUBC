import React, {useEffect, useState} from 'react';
import logo from './logo.svg';
import './App.css';
import DatasetInfoContainer from "./DatasetInfoContainer";
import {fetchDatasets} from "./api";
import {InsightDataset} from "../../src/controller/IInsightFacade";

function App() {
	const [datasets, setDatasets] = useState<InsightDataset[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [inputValue, setInputValue] = useState<string>("");
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setUploadedFile(e.target.files[0]);
		}
	};

	const handleSubmit = async () => {
		if (!uploadedFile) {
			setError("Please upload a file before submitting.");
			return;
		}

		try {
			const formData = new FormData();
			formData.append("file", uploadedFile);
			formData.append("inputValue", inputValue);

			const response = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error("Failed to upload file.");
			}

			const result = await response.json();
			console.log("File uploaded successfully:", result);
		} catch (err) {
			console.error(err);
			setError("An error occurred while uploading the file.");
		}
	};

	return (
		<div className="min-h-screen bg-green-100 flex flex-col items-center p-6">
			<header className="text-center mb-6">
				<h1 className="text-3xl font-bold">Welcome to InsightUBC</h1>
			</header>

			{/* Input Field */}
			<div className="mb-4">
				<label htmlFor="inputField" className="block mb-2 font-semibold">
					Enter some input:
				</label>
				<input
					id="inputField"
					type="text"
					value={inputValue}
					onChange={handleInputChange}
					className="border rounded px-4 py-2 w-full max-w-md"
					placeholder="Type something..."
				/>
			</div>

			{/* File Upload */}
			<div className="mb-4">
				<label htmlFor="fileUpload" className="block mb-2 font-semibold">
					Upload a file:
				</label>
				<input
					id="fileUpload"
					type="file"
					onChange={handleFileUpload}
					className="block w-full max-w-md"
				/>
				{uploadedFile && (
					<p className="text-green-700 mt-2">
						File ready: {uploadedFile.name}
					</p>
				)}
			</div>

			{/* Submit Button */}
			<div>
				<button
					onClick={handleSubmit}
					className="bg-blue-500 text-white px-4 py-2 rounded mt-4 hover:bg-blue-700"
				>
					Submit
				</button>
			</div>

			{/* Dataset Info Container */}
			<div className="w-full max-w-3xl mt-6">
				<DatasetInfoContainer datasets={datasets} />
			</div>

			{/* Error Handling */}
			{error && <p className="text-red-500 mt-4">{error}</p>}
		</div>
	);

}

export default App;
