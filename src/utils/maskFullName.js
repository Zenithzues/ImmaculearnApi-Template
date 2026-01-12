export default function maskFullName(full_name) {
    if (!full_name) return null;

    const parts = full_name.trim().split(' ');
    if (parts.length === 1) return parts[0]; // single name, return as is

    const firstName = capitalizeFirstLetter(parts[0]);
    const lastInitial = parts[1][0].toUpperCase(); // first letter of last name
    return `${firstName} ${lastInitial}.`;
}

export function capitalizeFirstLetter(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}