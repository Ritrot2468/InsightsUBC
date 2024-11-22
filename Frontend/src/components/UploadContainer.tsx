import React, { useState } from "react";
import Log from "@ubccpsc310/folder-test/build/Log";

interface UploadContainerProps {
	onUploadComplete: () => void;
}

const UploadContainer: React.FC<UploadContainerProps> = ({ onUploadComplete }) => {
	const [inputValue, setInputValue] = useState<string>("");
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		//setError(null);
		setSuccess(null);
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
			//setSuccess(null);
			return;
		}
		//setSuccess(null);
		setError(null);
		try {
			const formData = await uploadedFile.arrayBuffer();
			// Log.info(formData)
			// Log.info(uploadedFile)
			// Log.info(inputValue)

			//Log.info("about to make call")
			const response = await fetch(`http://localhost:4321/dataset/${inputValue}/sections`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/octet-stream",
				},
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json();
				const errorMessage = errorData?.error || "Failed to upload file.";
				setError(errorMessage);
				throw new Error(errorMessage);
			}

			//console.log("File uploaded successfully:", response);
			setSuccess(`${inputValue} was added successfully`);
			setInputValue("");
			onUploadComplete();

		} catch (err: any) {
			console.error(err);
			//setError("An error occurred while uploading the file.");
			setError(err.message);
			//setSuccess(null);
		}
	};

	return (
		<div className="w-full max-w-md bg-white rounded-md shadow-md p-6">
			<div className="mb-4">
				<label htmlFor="inputField" className="block mb-2 font-semibold">
					Dataset ID:
				</label>
				<input
					id="inputField"
					type="text"
					value={inputValue}
					onChange={handleInputChange}
					className="border rounded px-4 py-2 w-full"
					placeholder="ID must not contain '_' and must be unique"
				/>
			</div>

			<div className="mb-4">
				<label htmlFor="fileUpload" className="block mb-2 font-semibold">
					Upload Dataset file:
				</label>
				<input
					id="fileUpload"
					type="file"
					onChange={handleFileUpload}
					className="block w-full border py-1 px-1 rounded"
				/>
				{uploadedFile && <p className="text-green-700 mt-2">File ready: {uploadedFile.name}</p>}
			</div>

			<div>
				<button onClick={handleSubmit} className="bg-blue-500 w-full text-white px-4 py-2 rounded hover:bg-blue-700">
					Submit
				</button>
			</div>

			{error && <p className="text-red-500 mt-4">{error}</p>}
			{success && <p className="text-green-500 mt-4">{success}</p>}
		</div>
	);
};

export default UploadContainer;
