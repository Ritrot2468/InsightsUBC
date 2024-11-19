import React, { useState } from "react";
import Log from "@ubccpsc310/folder-test/build/Log";

interface UploadContainerProps {
	onUploadComplete: () => void;
}

const UploadContainer: React.FC<UploadContainerProps> = ({ onUploadComplete }) => {
	const [inputValue, setInputValue] = useState<string>("");
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);

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
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json();
				const errorMessage = errorData?.error || "Failed to upload file.";
				setError(errorMessage);
				//throw new Error("Failed to upload file.");
			}

			console.log("File uploaded successfully:", response);

			onUploadComplete();
		} catch (err) {
			console.error(err);
			setError("An error occurred while uploading the file.");
		}
	};

	return (
		<div className="w-full max-w-md">
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
					placeholder="Type something..."
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
					className="block w-full"
				/>
				{uploadedFile && (
					<p className="text-green-700 mt-2">File ready: {uploadedFile.name}</p>
				)}
			</div>

			<div>
				<button
					onClick={handleSubmit}
					className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
				>
					Submit
				</button>
			</div>

			{error && <p className="text-red-500 mt-4">{error}</p>}
		</div>
	);
};

export default UploadContainer;
