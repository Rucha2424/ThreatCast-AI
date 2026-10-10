from pathlib import Path
import struct
import socket

# Creates a synthetic PCAP with:
# - 6 x 30-second temporal windows (enough for the 5-state world-model input)
# - 5 deterministic evidence-flagged TCP flows in the first window
# - benign traffic in later windows so the temporal sequence is continuous
#
# This is a synthetic TEST FIXTURE only. It is not malware or real attack traffic.

OUT = Path("threatcast_flagged_flow_test.pcap")


def ip_bytes(ip):
    return socket.inet_aton(ip)


def tcp_packet(
    src_ip,
    dst_ip,
    src_port,
    dst_port,
    flags,
    seq=0,
    ack=0,
    payload=b"",
    ttl=64,
    window=8192,
):
    version_ihl = 0x45
    tos = 0
    total_length = 20 + 20 + len(payload)
    identification = 0
    frag_flags_offset = 0
    checksum = 0

    ip_header = struct.pack(
        "!BBHHHBBH4s4s",
        version_ihl,
        tos,
        total_length,
        identification,
        frag_flags_offset,
        ttl,
        6,
        checksum,
        ip_bytes(src_ip),
        ip_bytes(dst_ip),
    )

    data_offset = 5
    offset_reserved = data_offset << 4
    tcp_checksum = 0
    urgent_pointer = 0

    tcp_header = struct.pack(
        "!HHIIBBHHH",
        src_port,
        dst_port,
        seq,
        ack,
        offset_reserved,
        flags,
        window,
        tcp_checksum,
        urgent_pointer,
    )

    dst_mac = bytes.fromhex("00 11 22 33 44 55")
    src_mac = bytes.fromhex("66 77 88 99 aa bb")
    ethernet_header = dst_mac + src_mac + struct.pack("!H", 0x0800)

    return ethernet_header + ip_header + tcp_header + payload


packets = []
base = 1_700_000_000

# ---------------------------------------------------------
# WINDOW 0: suspicious-looking deterministic evidence
# ---------------------------------------------------------
# One source contacts five different destination ports with
# SYN packets that have no observed ACK response.
source = "10.10.10.10"
destination = "10.20.20.20"

for i, port in enumerate([21, 22, 23, 80, 443]):
    packets.append(
        (
            base,
            i * 100_000,
            tcp_packet(
                source,
                destination,
                40000 + i,
                port,
                0x02,  # SYN
                seq=1000 + i,
            ),
        )
    )

# A normal-looking response-like packet.
packets.append(
    (
        base + 1,
        0,
        tcp_packet(
            destination,
            source,
            80,
            40003,
            0x18,  # PSH + ACK
            seq=2000,
            ack=1001,
            payload=b"THREATCAST_TEST",
        ),
    )
)

# ---------------------------------------------------------
# WINDOWS 1-5: benign temporal traffic
# ---------------------------------------------------------
# These packets are deliberately spread over 30-second
# boundaries so the PCAP produces >= 5 temporal states.
for window_index, timestamp in enumerate(
    [30, 60, 90, 120, 150],
    start=1,
):
    packets.append(
        (
            base + timestamp,
            0,
            tcp_packet(
                "10.30.30.30",
                "10.40.40.40",
                45000,
                443,
                0x10,  # ACK
                seq=3000 + window_index,
                ack=4000 + window_index,
            ),
        )
    )


# Classic libpcap global header.
# Link type 1 = Ethernet.
with OUT.open("wb") as handle:
    handle.write(
        struct.pack(
            "<IHHIIII",
            0xA1B2C3D4,
            2,
            4,
            0,
            0,
            65535,
            1,
        )
    )

    for seconds, microseconds, packet in packets:
        handle.write(
            struct.pack(
                "<IIII",
                seconds,
                microseconds,
                len(packet),
                len(packet),
            )
        )
        handle.write(packet)

print(f"Created: {OUT.resolve()}")
print(f"Packets: {len(packets)}")
print("Capture span: 150 seconds")
print("Expected temporal states: 6")
print("Expected minimum model sequence: 5 states")
print("Expected deterministic flagged flows: 5")
