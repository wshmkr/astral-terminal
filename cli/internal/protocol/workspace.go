package protocol

type WorkspaceTab struct {
	SurfaceID string `json:"surfaceId"`
	Type      string `json:"type"`
	Name      string `json:"name"`
	Cwd       string `json:"cwd"`
	URL       string `json:"url"`
	Active    bool   `json:"active"`
}

// WorkspaceNode is a layout node: a pane when PaneID is set, otherwise a split with Children.
type WorkspaceNode struct {
	PaneID  string         `json:"paneId"`
	Focused bool           `json:"focused"`
	Tabs    []WorkspaceTab `json:"tabs"`

	SplitID   string          `json:"splitId"`
	Direction string          `json:"direction"`
	Sizes     []float64       `json:"sizes"`
	Children  []WorkspaceNode `json:"children"`
}

type WorkspaceInfo struct {
	ID        string         `json:"id"`
	Index     int            `json:"index"`
	Name      string         `json:"name"`
	Active    bool           `json:"active"`
	PaneCount int            `json:"paneCount"`
	TabCount  int            `json:"tabCount"`
	Layout    *WorkspaceNode `json:"layout"`
}

type WorkspaceList struct {
	Workspaces []WorkspaceInfo `json:"workspaces"`
}

type WorkspaceCreated struct {
	WorkspaceID string `json:"workspaceId"`
	PaneID      string `json:"paneId"`
	SurfaceID   string `json:"surfaceId"`
}

type WorkspaceAction struct {
	WorkspaceID string `json:"workspaceId"`
}
