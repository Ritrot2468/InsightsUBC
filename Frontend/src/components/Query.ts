// Enum for sorting direction
enum SortDirection {
	UP = "UP",
	DOWN = "DOWN",
}

// Enum for logic operations in filters
enum Logic {
	AND = "AND",
	OR = "OR",
}

// Enum for comparison operators
enum MComparator {
	LT = "LT",
	GT = "GT",
	EQ = "EQ",
}

// Apply token types
enum ApplyToken {
	MAX = "MAX",
	MIN = "MIN",
	AVG = "AVG",
	COUNT = "COUNT",
	SUM = "SUM",
}

// Main query structure
interface Query {
	BODY: Body;
	OPTIONS: QueryOptions;
	TRANSFORMATIONS?: QueryTransformations;
}

// Body structure (includes WHERE with optional FILTER)
interface Body {
	WHERE: Filter | {};
}

// Different types of filters that can appear in the WHERE clause
type Filter = LogicComparison | MComparison | SComparison | Negation;

// Logic Comparison filter
interface LogicComparison {
	LOGIC: Logic;
	FILTER_LIST: Filter[];
}

// MComparison filter (for numeric comparisons)
interface MComparison {
	MCOMPARATOR: MComparator;
	mkey: string;
	value: number;
}

// SComparison filter (for string comparisons)
interface SComparison {
	IS: {
		skey: string;
		value: string; // Wildcard support not implemented here, but can be handled with regex
	};
}

// Negation filter
interface Negation {
	NOT: Filter;
}

// Query options including columns and optional sorting
interface QueryOptions {
	COLUMNS: string[];
	SORT?: Sort;
}

// Sorting configuration
interface Sort {
	ORDER: {
		dir: SortDirection;
		keys: string[];
	};
}

// Transformations applied to the query (grouping and applying operations)
interface QueryTransformations {
	GROUP: string[];
	APPLY?: ApplyRule[];
}

// Apply operation rule
interface ApplyRule {
	applykey: string;
	APPLYTOKEN: ApplyToken;
	KEY: string;
}

// Example of keys (mkeys, skeys)
type Key = string; // Simple string representation of keys (could be more complex if needed)
