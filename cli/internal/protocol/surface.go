package protocol

type TabInfo struct {
	SurfaceID   string  `json:"surfaceId"`
	PaneID      string  `json:"paneId"`
	WorkspaceID string  `json:"workspaceId"`
	Type        string  `json:"type"`
	Name        string  `json:"name"`
	Cwd         *string `json:"cwd,omitempty"`
	URL         *string `json:"url,omitempty"`
	Active      bool    `json:"active"`
}

type TabList struct {
	Surfaces []TabInfo `json:"surfaces"`
}

type TabCreated struct {
	WorkspaceID string `json:"workspaceId"`
	PaneID      string `json:"paneId"`
	SurfaceID   string `json:"surfaceId"`
}

type TabRef struct {
	SurfaceID string `json:"surfaceId"`
}

type TabMoved struct {
	SurfaceID string `json:"surfaceId"`
	PaneID    string `json:"paneId"`
}
