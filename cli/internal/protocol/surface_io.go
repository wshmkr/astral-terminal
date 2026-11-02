package protocol

type TabIOSendTextResult struct {
	SurfaceID string `json:"surfaceId"`
	Bytes     int    `json:"bytes"`
}

type TabIOSurfaceResult struct {
	SurfaceID string `json:"surfaceId"`
}

type TabIOReadResult struct {
	SurfaceID string `json:"surfaceId"`
	Text      string `json:"text"`
}
