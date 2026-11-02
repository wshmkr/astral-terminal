package client

import (
	"bufio"
	"encoding/binary"
	"encoding/hex"
	"net"
	"os"
	"strings"
)

const (
	loopbackHost = "127.0.0.1"
	routeFile    = "/proc/net/route"
	resolvFile   = "/etc/resolv.conf"
)

// Candidates lists hosts that might reach the Windows app from inside WSL, best first: a
// previously working host, loopback (mirrored networking), then the NAT default gateway and
// resolv.conf nameserver.
func Candidates(cached, routePath, resolvPath string) []string {
	hosts := []string{cached, loopbackHost, defaultGateway(routePath), firstNameserver(resolvPath)}
	seen := make(map[string]bool, len(hosts))
	out := make([]string, 0, len(hosts))
	for _, h := range hosts {
		if h == "" || seen[h] {
			continue
		}
		seen[h] = true
		out = append(out, h)
	}
	return out
}

func defaultGateway(path string) string {
	f, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		fields := strings.Fields(sc.Text())
		if len(fields) < 3 || fields[1] != "00000000" {
			continue
		}
		raw, err := hex.DecodeString(fields[2])
		if err != nil || len(raw) != 4 {
			continue
		}
		gw := binary.BigEndian.Uint32(raw)
		if gw == 0 {
			continue
		}
		ip := make(net.IP, 4)
		binary.LittleEndian.PutUint32(ip, gw)
		return ip.String()
	}
	return ""
}

func firstNameserver(path string) string {
	f, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		fields := strings.Fields(sc.Text())
		if len(fields) >= 2 && fields[0] == "nameserver" {
			return fields[1]
		}
	}
	return ""
}
