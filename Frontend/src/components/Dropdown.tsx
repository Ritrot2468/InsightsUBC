interface dropdownProps {
	label: string;
	selection: string | null;
	selectHandler: (event: React.ChangeEvent<HTMLSelectElement>) => void;
	defaultOption: string;
	options: string[];
}

function DropdownInput({ label, selection, selectHandler, defaultOption, options }: dropdownProps): React.ReactElement {
	return (
		<div className="my-4">
			<label htmlFor="dropdown" className="block font-medium my-4">
				{label}
			</label>
			<select
				id="dropdown"
				value={selection || ""}
				onChange={selectHandler}
				className="block w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
			>
				<option value="" disabled>
					{defaultOption}
				</option>
				{options.map((option, index) => (
					<option key={index} value={option}>
						{option}
					</option>
				))}
			</select>
		</div>
	);
}

export default DropdownInput;
