#!/bin/bash
set -e

echo "Publishing @react-component-selector-mcp/cli..."
cd packages/cli
npm publish --provenance --access public || echo "cli: Already published or failed"

echo "Publishing @react-component-selector-mcp/react..."
cd ../react
npm publish --provenance --access public || echo "react: Already published or failed"

echo "Done!"
