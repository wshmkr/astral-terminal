package protocol

type PaneSplitResult struct {
	WorkspaceID *string `json:"workspaceId"`
	PaneID      *string `json:"paneId"`
	SurfaceID   *string `json:"surfaceId"`
}

type PaneInfo struct {
	PaneID          string  `json:"paneId"`
	WorkspaceID     string  `json:"workspaceId"`
	Focused         bool    `json:"focused"`
	ActiveSurfaceID *string `json:"activeSurfaceId"`
	TabCount        int     `json:"tabCount"`
}

type PaneListResult struct {
	Panes []PaneInfo `json:"panes"`
}

type PaneRefResult struct {
	PaneID *string `json:"paneId"`
}

type PaneResizeResult struct {
	PaneID *string   `json:"paneId"`
	Sizes  []float64 `json:"sizes"`
}
