import React, { Component } from "react";
import {deleteDataset} from "./api";

interface DatasetProps {
	id: string;
	numRows: string;
	onClose: (id: string) => void; // Callback when the dataset is closed
}

interface DatasetState {
	isVisible: boolean;
}

class Dataset extends Component<DatasetProps, DatasetState> {
	constructor(props: DatasetProps) {
		super(props);
		this.state = {
			isVisible: true,
		};
	}

	handleClose = () => {
		const { id, onClose } = this.props;

		deleteDataset(id).then(() => {
			this.setState({ isVisible: false }, () => {
				onClose(id);
			});
		}).catch(() => {
			console.error("Failed to delete dataset.");
		});
	};


	render() {
		const { id, numRows } = this.props;
		const { isVisible } = this.state;

		if (!isVisible) return null;

		return (
			<div className="p-4 bg-blue-200 rounded-full shadow-md flex items-center justify-between w-full">
				<span className="font-bold text-blue-900">Set ID: {id}</span>
				<span className="font-bold text-blue-900">Section Count: {numRows}</span>
				<button
					onClick={this.handleClose}
					className="bg-red-500 text-white rounded-full px-2 py-1 ml-4 hover:bg-red-700"
				>
					Delete
				</button>
			</div>
		);
	}
}

export default Dataset;
