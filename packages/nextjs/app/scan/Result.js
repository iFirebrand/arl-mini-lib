"use client";

import PropTypes from "prop-types";

const Result = ({ result }) => {
  return <li>ISBN {result.codeResult.code} scanned</li>;
};

Result.propTypes = {
  result: PropTypes.object.isRequired,
};

export default Result;
