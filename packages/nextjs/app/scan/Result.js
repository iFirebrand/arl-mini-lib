"use client";

import PropTypes from "prop-types";

const Result = ({ result }) => {
  return <li>{result.codeResult.code}</li>;
};

Result.propTypes = {
  result: PropTypes.object.isRequired,
};

export default Result;
