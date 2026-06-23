import {reactive} from 'vue';

export const store = reactive({
    jsonResult: {
        scanResults: null,
        testResults: null,
        parsedTestResults: [],
    },
    safeDir: '',
    languageDetails: null,
    ruleFilePath: '',
    ruleEditorCode: {
        originalRule: '',
        normalizedRule: ''
    },
    codeEditorCode: '',
    codeEditorDebugLocation: null,
    mustNotMatchTestCases: [],
    disableEvalButton: true,
    taintIntrafile: true,
});