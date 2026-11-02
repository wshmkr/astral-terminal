package protocol

import "encoding/json"

const (
	CodeParseError    = "parse_error"
	CodeBadEnvelope   = "bad_envelope"
	CodeUnauthorized  = "unauthorized"
	CodeUnknownMethod = "unknown_method"
	CodeInvalidParams = "invalid_params"
	CodeInternalError = "internal_error"
)

const AuthMethod = "auth.hello"

type Request struct {
	ID     string `json:"id"`
	Method string `json:"method"`
	Params any    `json:"params"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type Response struct {
	ID     json.RawMessage `json:"id"`
	OK     bool            `json:"ok"`
	Result json.RawMessage `json:"result,omitempty"`
	Error  *ErrorBody      `json:"error,omitempty"`
}

type Capabilities struct {
	ProtocolVersion int      `json:"protocolVersion"`
	Methods         []string `json:"methods"`
}
