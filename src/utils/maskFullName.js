export default function maskFullName(full_name) {
    if (!full_name) return null;

    const parts = full_name.trim().split(/\s+/);
    if (parts.length === 1) return capitalizeFirstLetter(parts[0]); // single name, return as is

    const firstName = parts.length > 2 ? `${capitalizeFirstLetter(parts[0])} ${capitalizeFirstLetter(parts[1])}` : capitalizeFirstLetter(parts[0]);

    // const lastNameParts = parts.slice(2);
    // const lastInitial = lastNameParts.map(part => part.charAt(0).toUpperCase()).join('.'); // first letter of last name

    const lastNameStartIndex = parts.length > 2 ? 2 : 1;

    const lastInitials = parts
        .slice(lastNameStartIndex)
        .map(part => part.charAt(0).toUpperCase())
        .join('.');

    return `${firstName} ${lastInitials}.`;
}

export function capitalizeFirstLetter(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}